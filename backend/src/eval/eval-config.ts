// ---------------------------------------------------------------------------
// Eval system configuration – types, thresholds, and helpers
// ---------------------------------------------------------------------------

// ── Category & Case ────────────────────────────────────────────────────────

export type EvalCategory =
  | "retrieval"
  | "hallucination"
  | "proposal"
  | "priority"
  | "end-to-end";

export interface EvalCase {
  id: string;
  category: EvalCategory;
  difficulty: "easy" | "medium" | "hard";
  ticket: {
    title: string;
    description: string;
    reporterName: string;
    source: "MANUAL";
  };
  expectedPriority: {
    level: "low" | "medium" | "high" | "critical";
    acceptableAlternatives?: string[];
  };
  expectedRelevantFiles: {
    mustInclude: string[]; // Files that MUST appear in results
    shouldInclude?: string[]; // Nice-to-have
    mustNotInclude?: string[]; // Should NOT appear (hallucination check)
  };
  expectedProposal: {
    mustMentionConcepts: string[];
    mustNotClaim: string[];
    acceptableApproaches?: string[];
  };
  goldenAnalysis?: {
    affectedFeature: string;
    suspectedFlow: string;
  };
}

// ── Retrieval Metrics ──────────────────────────────────────────────────────

export interface RetrievalMetrics {
  precision: number;
  recall: number;
  f1Score: number;
  mrr: number;
  truePositives: string[];
  falsePositives: string[];
  falseNegatives: string[];
  returnedFiles: string[];
  expectedFiles: string[];
  fileRanks: { filePath: string; rank: number | null }[];
}

// ── Hallucination Metrics ──────────────────────────────────────────────────

export interface HallucinationMetrics {
  fabricatedFilePaths: string[];
  fabricatedFileRate: number;
  fabricatedSnippets: {
    filePath: string;
    claimed: string;
    actual: string | null;
  }[];
  fabricatedSnippetRate: number;
  prohibitedClaims: string[];
  prohibitedClaimRate: number;
  overallHallucinationRate: number;
}

// ── Proposal Metrics ───────────────────────────────────────────────────────

export interface ProposalMetrics {
  conceptCoverage: number;
  missingConcepts: string[];
  hasHypotheses: boolean;
  hasSteps: boolean;
  hasRisks: boolean;
  hasVerificationSteps: boolean;
  structuralScore: number;
  approachValid: boolean | null;
  aiConfidence: number;
  overallScore: number;
}

// ── Priority Metrics ───────────────────────────────────────────────────────

export interface PriorityMetrics {
  expected: string;
  actual: string;
  isExactMatch: boolean;
  isAcceptable: boolean;
}

// ── Eval Result ────────────────────────────────────────────────────────────

export interface EvalResult {
  caseId: string;
  category: EvalCategory;
  difficulty: string;
  ticketTitle: string;
  timestamp: string;
  durationMs: number;
  workflowStatus: string;
  retrieval: RetrievalMetrics;
  hallucination: HallucinationMetrics;
  proposal: ProposalMetrics;
  priority: PriorityMetrics;
}

// ── Run Configuration ──────────────────────────────────────────────────────

export interface EvalRunConfig {
  cases: EvalCase[];
  repositoryId?: string;
  indexName: string;
  retrievalStrategy: "hybrid" | "vector" | "keyword";
  maxResults: number;
  concurrency: number;
}

// ── Aggregate Metrics ──────────────────────────────────────────────────────

export interface AggregateMetrics {
  totalCases: number;
  avgPrecision: number;
  avgRecall: number;
  avgF1: number;
  avgMRR: number;
  avgHallucinationRate: number;
  avgFabricatedFileRate: number;
  avgProposalScore: number;
  priorityAccuracy: number;
  priorityAcceptableRate: number;
}

// ── Threshold Result ───────────────────────────────────────────────────────

export interface ThresholdResult {
  metric: string;
  value: number;
  threshold: number;
  direction: "min" | "max";
  pass: boolean;
}

// ── Eval Report ────────────────────────────────────────────────────────────

export interface EvalReport {
  runId: string;
  timestamp: string;
  config: {
    retrievalStrategy: string;
    maxResults: number;
    indexName: string;
    totalCases: number;
  };
  aggregate: AggregateMetrics;
  results: EvalResult[];
  thresholdResults: ThresholdResult[];
  overallPass: boolean;
}

// ── Threshold Constants ────────────────────────────────────────────────────

export const EVAL_THRESHOLDS = {
  retrieval: {
    minPrecision: 0.6,
    minRecall: 0.7,
    minF1: 0.65,
    minMRR: 0.7,
  },
  hallucination: {
    maxOverallRate: 0.1,
    maxFabricatedFileRate: 0.05,
    maxFabricatedSnippetRate: 0.1,
  },
  proposal: {
    minConceptCoverage: 0.6,
    minStructuralScore: 0.75,
    minOverallScore: 0.6,
  },
  priority: {
    minAccuracy: 0.8,
    minAcceptableRate: 0.9,
  },
} as const;

// ── Threshold Checker ──────────────────────────────────────────────────────

/**
 * Compare every metric in `aggregate` against the configured thresholds and
 * return an array of pass / fail results.
 */
export function checkThresholds(
  aggregate: AggregateMetrics,
): ThresholdResult[] {
  const results: ThresholdResult[] = [];

  const check = (
    metric: string,
    value: number,
    threshold: number,
    direction: "min" | "max",
  ): void => {
    results.push({
      metric,
      value,
      threshold,
      direction,
      pass: direction === "min" ? value >= threshold : value <= threshold,
    });
  };

  // Retrieval
  const rt = EVAL_THRESHOLDS.retrieval;
  check("retrieval.precision", aggregate.avgPrecision, rt.minPrecision, "min");
  check("retrieval.recall", aggregate.avgRecall, rt.minRecall, "min");
  check("retrieval.f1", aggregate.avgF1, rt.minF1, "min");
  check("retrieval.mrr", aggregate.avgMRR, rt.minMRR, "min");

  // Hallucination
  const ht = EVAL_THRESHOLDS.hallucination;
  check(
    "hallucination.overallRate",
    aggregate.avgHallucinationRate,
    ht.maxOverallRate,
    "max",
  );
  check(
    "hallucination.fabricatedFileRate",
    aggregate.avgFabricatedFileRate,
    ht.maxFabricatedFileRate,
    "max",
  );

  // Proposal
  const pt = EVAL_THRESHOLDS.proposal;
  check(
    "proposal.overallScore",
    aggregate.avgProposalScore,
    pt.minOverallScore,
    "min",
  );

  // Priority
  const pr = EVAL_THRESHOLDS.priority;
  check("priority.accuracy", aggregate.priorityAccuracy, pr.minAccuracy, "min");
  check(
    "priority.acceptableRate",
    aggregate.priorityAcceptableRate,
    pr.minAcceptableRate,
    "min",
  );

  return results;
}
