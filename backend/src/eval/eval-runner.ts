// ---------------------------------------------------------------------------
// Eval runner – orchestrates evaluation runs through the workflow service
// ---------------------------------------------------------------------------

import { workflowService } from "../services/workflow.service.js";
import { prisma } from "../config/prisma.js";
import {
  computeRetrievalMetrics,
  computeProposalMetrics,
  computePriorityMetrics,
  computeAggregateMetrics,
} from "./eval-metrics.js";
import { computeHallucinationMetrics } from "./eval-hallucination-checker.js";
import {
  checkThresholds,
  type EvalCase,
  type EvalResult,
  type EvalRunConfig,
  type EvalReport,
} from "./eval-config.js";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateRunId(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

/**
 * Safely parse a JSON column from workflow state.
 * Prisma stores JSON columns as `Prisma.JsonValue` which is already
 * parsed at runtime, but we still guard against string-valued entries.
 */
function safeJsonParse(value: unknown): any {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

/**
 * Extract unique file paths returned by both repo search and code context.
 */
function extractReturnedFiles(
  repoSearchData: any,
  codeContextData: any,
): string[] {
  const paths = new Set<string>();

  // Repo search results
  const searchResults = repoSearchData?.results ?? [];
  for (const r of searchResults) {
    if (r?.filePath) paths.add(r.filePath);
  }

  // Code context relevant files
  const contextFiles = codeContextData?.relevantFiles ?? [];
  for (const f of contextFiles) {
    if (f?.filePath) paths.add(f.filePath);
  }

  return [...paths];
}

/**
 * Build a concatenated text from fix proposal for hallucination scanning.
 */
function buildFixProposalText(fixProposal: any): string {
  if (!fixProposal) return "";

  const parts: string[] = [];
  if (fixProposal.title) parts.push(fixProposal.title);
  if (Array.isArray(fixProposal.hypotheses)) {
    parts.push(...fixProposal.hypotheses);
  }
  if (fixProposal.recommendedApproach) {
    parts.push(fixProposal.recommendedApproach);
  }
  if (Array.isArray(fixProposal.steps)) parts.push(...fixProposal.steps);
  if (Array.isArray(fixProposal.risks)) parts.push(...fixProposal.risks);
  if (Array.isArray(fixProposal.verificationSteps)) {
    parts.push(...fixProposal.verificationSteps);
  }

  return parts.join(" ");
}

/**
 * Format a number as a fixed-width string with 2 decimal places.
 */
function fmt(n: number): string {
  return n.toFixed(2);
}

/* ------------------------------------------------------------------ */
/*  Run a single evaluation case                                       */
/* ------------------------------------------------------------------ */

export async function runSingleCase(
  evalCase: EvalCase,
  config: Omit<EvalRunConfig, "cases">,
  repoFilePaths: string[],
): Promise<EvalResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  try {
    // 1. Create workflow
    let workflow = await workflowService.create({
      retrievalStrategy: config.retrievalStrategy,
      forceReindex: false,
      maxResults: config.maxResults,
      runAsync: false,
      indexName: config.indexName,
      repositoryId: config.repositoryId,
      ticket: evalCase.ticket,
    });

    // 2. Run all agents sequentially
    while (workflow.nextAgent) {
      workflow = await workflowService.acceptAgent(workflow.id, {
        runAsync: false,
      });
    }

    const durationMs = Date.now() - startTime;

    // 3. Extract outputs from workflow state
    const state = workflow.state;
    const repoSearchData = safeJsonParse(state?.repoSearchResults);
    const codeContextData = safeJsonParse(state?.codeContext);
    const fixProposalData = safeJsonParse(state?.fixProposal);
    const priorityData = safeJsonParse(state?.priorityClassification);

    // 4. Collect returned file paths
    const returnedFiles = extractReturnedFiles(repoSearchData, codeContextData);

    // 5. Compute retrieval metrics
    const retrieval = computeRetrievalMetrics(
      returnedFiles,
      evalCase.expectedRelevantFiles,
    );

    // 6. Compute hallucination metrics
    const searchResults = (repoSearchData?.results ?? []).map((r: any) => ({
      filePath: r?.filePath ?? "",
      snippet: r?.snippet,
    }));
    const contextFiles = (codeContextData?.relevantFiles ?? []).map(
      (f: any) => ({
        filePath: f?.filePath ?? "",
        excerpt: f?.excerpt,
      }),
    );
    const fixProposalText = buildFixProposalText(fixProposalData);

    const hallucination = computeHallucinationMetrics({
      repoSearchResults: searchResults,
      codeContextFiles: contextFiles,
      fixProposalText,
      repoFilePaths,
      evalCase,
    });

    // 7. Compute proposal metrics
    const proposal = computeProposalMetrics(
      fixProposalData,
      evalCase.expectedProposal,
    );

    // 8. Compute priority metrics
    const priority = computePriorityMetrics(
      priorityData?.level,
      evalCase.expectedPriority,
    );

    return {
      caseId: evalCase.id,
      category: evalCase.category,
      difficulty: evalCase.difficulty,
      ticketTitle: evalCase.ticket.title,
      timestamp,
      durationMs,
      workflowStatus: workflow.status,
      retrieval,
      hallucination,
      proposal,
      priority,
    };
  } catch (error) {
    // On failure, return zero-score metrics
    const durationMs = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    console.error(
      `  ✗ ${evalCase.id} FAILED: ${errorMessage}`,
    );

    return {
      caseId: evalCase.id,
      category: evalCase.category,
      difficulty: evalCase.difficulty,
      ticketTitle: evalCase.ticket.title,
      timestamp,
      durationMs,
      workflowStatus: `error: ${errorMessage.slice(0, 120)}`,
      retrieval: {
        precision: 0,
        recall: 0,
        f1Score: 0,
        mrr: 0,
        truePositives: [],
        falsePositives: [],
        falseNegatives: evalCase.expectedRelevantFiles.mustInclude,
        returnedFiles: [],
        expectedFiles: evalCase.expectedRelevantFiles.mustInclude,
        fileRanks: evalCase.expectedRelevantFiles.mustInclude.map((fp) => ({
          filePath: fp,
          rank: null,
        })),
      },
      hallucination: {
        fabricatedFilePaths: [],
        fabricatedFileRate: 0,
        fabricatedSnippets: [],
        fabricatedSnippetRate: 0,
        prohibitedClaims: [],
        prohibitedClaimRate: 0,
        overallHallucinationRate: 0,
      },
      proposal: {
        conceptCoverage: 0,
        missingConcepts: evalCase.expectedProposal.mustMentionConcepts,
        hasHypotheses: false,
        hasSteps: false,
        hasRisks: false,
        hasVerificationSteps: false,
        structuralScore: 0,
        approachValid: null,
        aiConfidence: 0,
        overallScore: 0,
      },
      priority: {
        expected: evalCase.expectedPriority.level,
        actual: "",
        isExactMatch: false,
        isAcceptable: false,
      },
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Run full evaluation                                                */
/* ------------------------------------------------------------------ */

export async function runEvaluation(
  config: EvalRunConfig,
): Promise<EvalReport> {
  const runId = generateRunId();
  const timestamp = new Date().toISOString();
  const totalCases = config.cases.length;

  console.log(`\n\x1b[36m\x1b[1m▶ TicketAssist Evaluation\x1b[0m`);
  console.log(
    `  Strategy: ${config.retrievalStrategy} | Cases: ${totalCases} | MaxResults: ${config.maxResults}`,
  );
  console.log(`  Index: ${config.indexName}`);
  console.log("");

  // 1. Get all repository file paths for hallucination checking
  let repoFilePaths: string[] = [];
  try {
    let repoId = config.repositoryId;
    if (!repoId) {
      // Look up the default repository
      const defaultRepo = await prisma.codeRepository.findFirst({
        where: { status: "READY" },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      repoId = defaultRepo?.id;
    }

    if (repoId) {
      const repoFiles = await prisma.codeRepositoryFile.findMany({
        where: { repositoryId: repoId },
        select: { relativePath: true },
      });
      repoFilePaths = repoFiles.map((f) => f.relativePath);
    }
  } catch {
    console.warn(
      "  ⚠ Could not load repo file paths for hallucination checking",
    );
  }

  console.log(
    `  Loaded ${repoFilePaths.length} repository file paths for hallucination checking\n`,
  );

  // 2. Run each case
  const results: EvalResult[] = [];

  for (let i = 0; i < config.cases.length; i++) {
    const evalCase = config.cases[i];
    const caseNum = `[${i + 1}/${totalCases}]`;

    console.log(`${caseNum} Running ${evalCase.id}: ${evalCase.ticket.title}`);

    const result = await runSingleCase(evalCase, config, repoFilePaths);
    results.push(result);

    // Print progress summary
    const statusIcon = result.workflowStatus.startsWith("error") ? "✗" : "✓";
    const statusColor = result.workflowStatus.startsWith("error")
      ? "\x1b[31m"
      : "\x1b[32m";
    console.log(
      `${caseNum} ${statusColor}${statusIcon}\x1b[0m ` +
        `P=${fmt(result.retrieval.precision)} ` +
        `R=${fmt(result.retrieval.recall)} ` +
        `F1=${fmt(result.retrieval.f1Score)} ` +
        `H=${fmt(result.hallucination.overallHallucinationRate)} ` +
        `Q=${fmt(result.proposal.overallScore)} ` +
        `Pri=${result.priority.isAcceptable ? "✓" : "✗"} ` +
        `(${(result.durationMs / 1000).toFixed(1)}s)`,
    );
    console.log("");
  }

  // 3. Compute aggregate metrics
  const aggregate = computeAggregateMetrics(results);

  // 4. Check thresholds
  const thresholdResults = checkThresholds(aggregate);
  const overallPass = thresholdResults.every((t) => t.pass);

  return {
    runId,
    timestamp,
    config: {
      retrievalStrategy: config.retrievalStrategy,
      maxResults: config.maxResults,
      indexName: config.indexName,
      totalCases,
    },
    aggregate,
    results,
    thresholdResults,
    overallPass,
  };
}
