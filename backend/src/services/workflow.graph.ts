import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { env } from "../config/env.js";
import { callJsonChat } from "./llm.service.js";
import { repoSearchService, generateQueryTerms, generateSemanticQuery } from "./repo-search.service.js";
import { redactPayload } from "./redaction.service.js";
import {
  appendError,
  appendTrace,
  codeContextSchema,
  fixProposalSchema,
  mentorDraftSchema,
  nowIso,
  priorityClassificationSchema,
  repoSearchSchema,
  ticketAnalysisSchema,
  type CodeContext,
  type FixProposal,
  type MentorDraft,
  type PriorityClassification,
  type TicketAnalysis,
  type TicketWorkflowState
} from "./workflow-state.js";

const WorkflowAnnotation = Annotation.Root({
  state: Annotation<TicketWorkflowState>({
    reducer: (_current, update) => update
  })
});

type GraphInput = typeof WorkflowAnnotation.State;

function summarizeText(text: string, maxLength = 220) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3)}...` : normalized;
}

function compactJson(value: unknown) {
  return JSON.stringify(redactPayload(value), null, 2);
}

function llmJson(value: unknown) {
  return JSON.stringify(redactPayload(value));
}

function getAgentInputPayload(agentName: string, state: TicketWorkflowState) {
  if (agentName === "TicketAnalyzerAgent") {
    return {
      ticket: state.ticket
    };
  }

  if (agentName === "PriorityClassifierAgent") {
    return {
      ticket: state.ticket,
      analysis: state.analysis
    };
  }

  if (agentName === "RepoSearchAgent") {
    return {
      ticket: state.ticket,
      analysis: state.analysis,
      priority: state.priority,
      repository: {
        repositoryId: state.repoConfig.repositoryId,
        strategy: state.repoConfig.retrievalStrategy,
        maxResults: state.repoConfig.maxResults
      }
    };
  }

  if (agentName === "CodeContextAgent") {
    return {
      ticket: state.ticket,
      analysis: state.analysis,
      priority: state.priority,
      repoSearch: {
        queryTerms: state.repoSearch?.queryTerms,
        semanticQuery: state.repoSearch?.semanticQuery,
        resultCount: state.repoSearch?.results.length,
        topResults: getTopSearchResults(state, 5)
      }
    };
  }

  if (agentName === "FixProposalAgent") {
    return {
      ticket: state.ticket,
      analysis: state.analysis,
      priority: state.priority,
      codeContext: state.codeContext
    };
  }

  return {
    ticket: state.ticket,
    analysis: state.analysis,
    priority: state.priority,
    repoSearchSummary: {
      queryTerms: state.repoSearch?.queryTerms,
      resultCount: state.repoSearch?.results.length
    },
    codeContext: state.codeContext,
    fixProposal: state.fixProposal
  };
}

function getAgentPromptPreview(agentName: string, state: TicketWorkflowState) {
  const input = getAgentInputPayload(agentName, state);

  if (agentName === "TicketAnalyzerAgent") {
    return compactJson({
      system:
        "You are TicketAnalyzerAgent. Analyze only the bug ticket. Do not classify priority. Do not search code. Return JSON only with keys: summary, keyFacts, affectedFeature, suspectedFlow, missingInfo.",
      user: input
    });
  }

  if (agentName === "PriorityClassifierAgent") {
    return compactJson({
      system:
        "You are PriorityClassifierAgent. Classify only ticket priority from the ticket and prior analysis. Do not search code. Return JSON only with keys: level, reason, confidence, severity, businessImpact.",
      user: input
    });
  }

  if (agentName === "RepoSearchAgent") {
    return compactJson({
      system: "Generate focused repository query terms and semantic search query from ticket analysis and priority.",
      user: input
    });
  }

  if (agentName === "CodeContextAgent") {
    return compactJson({
      system:
        "You are CodeContextAgent. Select the most relevant repository search results for mentor review. Do not propose a code fix. Return JSON only with keys: summary, relevantFiles, riskNotes, generatedAt.",
      user: input
    });
  }

  if (agentName === "FixProposalAgent") {
    return compactJson({
      system:
        "You are FixProposalAgent. Propose a constrained implementation approach for mentor review. Do not claim code was changed. Return JSON only with keys: title, hypotheses, recommendedApproach, steps, risks, verificationSteps, confidence.",
      user: input
    });
  }

  return compactJson({
    system:
      "You are MentorDraftAgent. Draft a concise mentor-review note using workflow outputs. Do not say the code is fixed. Do not send a customer response. Return JSON only with keys: response, checklist, internalNotes, generatedAt.",
    user: input
  });
}

function splitFacts(description: string) {
  const sentences = description
    .split(/[.!?\n]+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

  return sentences.slice(0, 6);
}

function detectAffectedFeature(text: string) {
  const lowerText = text.toLowerCase();
  const featureTerms = [
    "checkout",
    "coupon",
    "discount",
    "payment",
    "login",
    "signup",
    "cart",
    "order",
    "profile",
    "email",
    "password",
    "feedback",
    "product",
    "card"
  ];

  return featureTerms.find((term) => lowerText.includes(term));
}

function deterministicTicketAnalysis(state: TicketWorkflowState): TicketAnalysis {
  const description = state.ticket.description.trim();
  const facts = splitFacts(description);
  const title = state.ticket.title?.trim();
  const affectedFeature = detectAffectedFeature(`${title ?? ""} ${description}`);

  return ticketAnalysisSchema.parse({
    summary: summarizeText(facts[0] ?? description),
    keyFacts: facts.length > 0 ? facts : [summarizeText(description)],
    affectedFeature,
    suspectedFlow: affectedFeature ? `${affectedFeature} flow` : undefined,
    missingInfo: [
      "Exact reproduction steps",
      "Affected environment/version",
      "Relevant logs or request IDs"
    ]
  });
}

async function analyzeTicketWithLlm(state: TicketWorkflowState): Promise<TicketAnalysis> {
  const result = await callJsonChat({
    model: env.AI_MODEL_ANALYZER,
    messages: [
      {
        role: "system",
        content:
          "You are TicketAnalyzerAgent. Analyze only the bug ticket. Do not classify priority. Do not search code. Return JSON only with keys: summary, keyFacts, affectedFeature, suspectedFlow, missingInfo."
      },
      {
        role: "user",
        content: llmJson({
          title: state.ticket.title,
          description: state.ticket.description,
          metadata: state.ticket.metadata,
          requiredJsonShape: {
            summary: "string",
            keyFacts: ["string"],
            affectedFeature: "optional string",
            suspectedFlow: "optional string",
            missingInfo: ["optional string"]
          }
        })
      }
    ]
  });

  return ticketAnalysisSchema.parse(result);
}

function classifyPriority(state: TicketWorkflowState): PriorityClassification {
  const text = [
    state.ticket.title,
    state.ticket.description,
    state.analysis?.summary,
    ...(state.analysis?.keyFacts ?? [])
  ]
    .join(" ")
    .toLowerCase();

  const criticalSignals = [
    "production outage",
    "system crash",
    "data loss",
    "security",
    "vulnerability",
    "payment completely broken",
    "authentication completely broken",
    "many users blocked"
  ];
  const highSignals = [
    "production",
    "multiple users",
    "core feature",
    "checkout",
    "payment",
    "login",
    "no workaround",
    "blocked"
  ];
  const lowSignals = ["typo", "visual", "minor ui", "logging", "cosmetic"];

  const criticalScore = criticalSignals.filter((signal) => text.includes(signal)).length;
  const highScore = highSignals.filter((signal) => text.includes(signal)).length;
  const lowScore = lowSignals.filter((signal) => text.includes(signal)).length;

  if (criticalScore > 0) {
    return priorityClassificationSchema.parse({
      level: "critical",
      reason: "Critical production, security, data-loss, or complete core-workflow failure signal was found.",
      confidence: Math.min(0.95, 0.75 + criticalScore * 0.08),
      severity: "critical",
      businessImpact: "Core users or business operations may be fully blocked."
    });
  }

  if (highScore >= 2) {
    return priorityClassificationSchema.parse({
      level: "high",
      reason: "The ticket affects a core or production workflow and indicates meaningful user impact.",
      confidence: Math.min(0.9, 0.62 + highScore * 0.06),
      severity: "major",
      businessImpact: "Important user workflow is degraded or blocked."
    });
  }

  if (lowScore > 0 && highScore === 0) {
    return priorityClassificationSchema.parse({
      level: "low",
      reason: "The ticket appears limited to minor UI, copy, logging, or cosmetic impact.",
      confidence: 0.72,
      severity: "minor",
      businessImpact: "Low business impact."
    });
  }

  return priorityClassificationSchema.parse({
    level: "medium",
    reason: "A functional defect is described, but the available information does not prove broad or critical impact.",
    confidence: 0.68,
    severity: "major",
    businessImpact: "Limited or unconfirmed user impact."
  });
}

async function classifyPriorityWithLlm(state: TicketWorkflowState): Promise<PriorityClassification> {
  const result = await callJsonChat({
    model: env.AI_MODEL_PRIORITY,
    messages: [
      {
        role: "system",
        content:
          "You are PriorityClassifierAgent. Classify only ticket priority from the ticket and prior analysis. Do not search code. Return JSON only with keys: level, reason, confidence, severity, businessImpact. level must be low, medium, high, or critical. confidence must be 0 to 1. severity must be minor, major, or critical."
      },
      {
        role: "user",
        content: llmJson({
          ticket: state.ticket,
          analysis: state.analysis,
          priorityRules: {
            critical: [
              "production outage",
              "complete system crash",
              "data loss",
              "security vulnerability",
              "payment completely broken",
              "authentication completely broken",
              "many users blocked from a core workflow"
            ],
            high: [
              "core feature broken",
              "multiple users affected",
              "no easy workaround",
              "major business impact"
            ],
            medium: [
              "functional bug exists",
              "workaround available",
              "limited user impact",
              "non-critical workflow degraded"
            ],
            low: ["typo", "visual issue", "logging issue", "minor UI problem", "no core workflow impact"]
          },
          requiredJsonShape: {
            level: "low | medium | high | critical",
            reason: "string",
            confidence: "number 0..1",
            severity: "optional minor | major | critical",
            businessImpact: "optional string"
          }
        })
      }
    ]
  });

  return priorityClassificationSchema.parse(result);
}

function getTopSearchResults(state: TicketWorkflowState, limit = 6) {
  return [...(state.repoSearch?.results ?? [])]
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

function getMatchedTerms(state: TicketWorkflowState, text: string) {
  const lowerText = text.toLowerCase();
  return (state.repoSearch?.queryTerms ?? []).filter((term) => lowerText.includes(term.toLowerCase())).slice(0, 8);
}

function deterministicCodeContext(state: TicketWorkflowState): CodeContext {
  const topResults = getTopSearchResults(state);
  const relevantFiles = topResults.map((result) => {
    const searchableText = [result.filePath, result.snippet, ...(result.matchedLines?.map((line) => line.text) ?? [])]
      .filter(Boolean)
      .join(" ");

    return {
      filePath: result.filePath,
      startLine: result.startLine,
      endLine: result.endLine,
      relevanceScore: result.score,
      reason: `${result.matchType} match for ${state.analysis?.affectedFeature ?? "ticket"} context`,
      matchedTerms: getMatchedTerms(state, searchableText),
      excerpt: result.snippet ? summarizeText(result.snippet, 420) : undefined,
      riskNotes: [
        result.matchType === "filename"
          ? "Filename relevance should be confirmed against implementation details."
          : "Review the matched chunk before changing behavior."
      ]
    };
  });

  const riskNotes = [
    state.priority?.level === "critical" || state.priority?.level === "high"
      ? "High-impact ticket: verify the fix path with regression coverage before release."
      : "Confirm user impact before broadening the implementation scope.",
    relevantFiles.length === 0
      ? "Repository search returned no focused files; collect more ticket details or reindex the repository."
      : "Search results are candidate context, not proof of root cause."
  ];

  return codeContextSchema.parse({
    summary:
      relevantFiles.length > 0
        ? `Selected ${relevantFiles.length} likely file/chunk touchpoint(s) for ${state.analysis?.affectedFeature ?? "the reported issue"}.`
        : "No repository touchpoints were selected from search results.",
    relevantFiles,
    riskNotes,
    generatedAt: nowIso()
  });
}

function enrichCodeContextWithRepoIntelligence(codeContext: CodeContext, state: TicketWorkflowState): CodeContext {
  const graph = state.repoSearch?.dependencyGraph;
  const memoryMatches = state.repoSearch?.memoryMatches ?? [];
  const graphNodes = graph?.nodes.slice(0, 8).map((node) => `${node.kind}:${node.label} (${node.filePath})`) ?? [];
  const graphEdges = graph?.edges.slice(0, 8).map((edge) => `${edge.from} -[${edge.type}]-> ${edge.to}`) ?? [];

  return codeContextSchema.parse({
    ...codeContext,
    graphContext: graph
      ? {
          nodes: graphNodes,
          edges: graphEdges,
          summary:
            graphNodes.length > 0
              ? `Dependency context includes ${graph.nodes.length} node(s) and ${graph.edges.length} inferred edge(s).`
              : "No dependency graph nodes were inferred from the current search results."
        }
      : undefined,
    memoryContext:
      memoryMatches.length > 0
        ? {
            matches: memoryMatches,
            summary: `Found ${memoryMatches.length} prior workflow(s) with overlapping ticket/code signals.`
          }
        : undefined
  });
}

async function buildCodeContextWithLlm(state: TicketWorkflowState): Promise<CodeContext> {
  const result = await callJsonChat({
    model: env.AI_MODEL_CODE_CONTEXT,
    timeoutMs: 180000,
    messages: [
      {
        role: "system",
        content:
          "You are CodeContextAgent. Select the most relevant repository search results for mentor review. Do not propose a code fix. Return JSON only with keys: summary, relevantFiles, riskNotes, generatedAt. riskNotes and matchedTerms must always be arrays of strings, never a single string."
      },
      {
        role: "user",
        content: llmJson({
          ticket: state.ticket,
          analysis: state.analysis,
          priority: state.priority,
          searchQuery: state.repoSearch?.semanticQuery,
          queryTerms: state.repoSearch?.queryTerms,
          dependencyGraph: state.repoSearch?.dependencyGraph
            ? {
                nodes: state.repoSearch.dependencyGraph.nodes.slice(0, 20),
                edges: state.repoSearch.dependencyGraph.edges.slice(0, 20)
              }
            : undefined,
          memoryMatches: state.repoSearch?.memoryMatches,
          results: getTopSearchResults(state, 8).map((result) => ({
            filePath: result.filePath,
            score: result.score,
            matchType: result.matchType,
            startLine: result.startLine,
            endLine: result.endLine,
            matchedLines: result.matchedLines,
            snippet: result.snippet ? summarizeText(result.snippet, 700) : undefined,
            symbols: result.symbols
          })),
          requiredJsonShape: {
            summary: "string",
            relevantFiles: [
              {
                filePath: "string",
                startLine: "optional number",
                endLine: "optional number",
                relevanceScore: "number",
                reason: "string",
                matchedTerms: ["optional string"],
                excerpt: "optional string",
                riskNotes: ["optional string"]
              }
            ],
            riskNotes: ["string"],
            generatedAt: nowIso()
          }
        })
      }
    ]
  });

  return codeContextSchema.parse(result);
}

function deterministicFixProposal(state: TicketWorkflowState): FixProposal {
  const feature = state.analysis?.affectedFeature ?? "reported";
  const files = state.codeContext?.relevantFiles.map((file) => file.filePath).slice(0, 4) ?? [];

  return fixProposalSchema.parse({
    title: `Investigate ${feature} workflow failure with focused repository context`,
    hypotheses: [
      `${state.analysis?.summary ?? "The reported behavior"} may originate in one of the selected touchpoints.`,
      files.length > 0
        ? `Most likely files to inspect first: ${files.join(", ")}.`
        : "Repository evidence is weak; more reproduction details may be needed."
    ],
    recommendedApproach:
      "Confirm the failing path with reproduction steps, inspect the selected code context, make the smallest behavior change that addresses the root cause, and add regression coverage around the affected flow.",
    steps: [
      "Reproduce the ticket using the reporter-provided conditions.",
      "Inspect the top code context files and trace the affected flow.",
      "Implement the smallest guarded change once the root cause is confirmed.",
      "Add or update regression tests for the failing path and any fallback path."
    ],
    risks: [
      ...(state.codeContext?.riskNotes ?? []),
      "Do not assume the first search result is the root cause without reading the surrounding code."
    ],
    verificationSteps: [
      "Run the relevant unit or integration tests for the affected flow.",
      "Manually verify the reported reproduction path.",
      "Check that nearby successful paths still behave as expected."
    ],
    confidence: files.length > 0 ? 0.72 : 0.45
  });
}

function detectLikelyTestFramework(files: string[]) {
  const joined = files.join(" ").toLowerCase();

  if (/\b(package\.json|\.tsx?|\.jsx?)\b/.test(joined)) {
    return "npm test / TypeScript-JavaScript";
  }

  if (/\b(pom\.xml|mvnw?)\b/.test(joined)) {
    return "Maven";
  }

  if (/\b(build\.gradle|gradlew?)\b/.test(joined)) {
    return "Gradle";
  }

  if (/\bbuild\.xml\b/.test(joined)) {
    return "Ant";
  }

  if (/\b(pyproject\.toml|pytest|\.py)\b/.test(joined)) {
    return "pytest";
  }

  return "manual or repository-specific";
}

function buildPatchProposal(state: TicketWorkflowState, fixProposal: FixProposal) {
  const targetFiles = state.codeContext?.relevantFiles.map((file) => file.filePath).slice(0, 5) ?? [];
  const leadFile = targetFiles[0] ?? "selected source file";

  return {
    strategy: fixProposal.recommendedApproach,
    targetFiles,
    proposedDiff: [
      "diff --git a/<target-file> b/<target-file>",
      "--- a/<target-file>",
      "+++ b/<target-file>",
      "@@",
      `# Patch proposal placeholder for ${leadFile}`,
      "# 1. Reproduce and confirm the failing branch.",
      "# 2. Apply the smallest guarded change around the confirmed root cause.",
      "# 3. Add regression coverage from the generated test plan."
    ].join("\n"),
    applyMode: "manual_review" as const,
    confidence: fixProposal.confidence
  };
}

function buildTestPlan(state: TicketWorkflowState) {
  const files = state.codeContext?.relevantFiles.map((file) => file.filePath) ?? [];
  const framework = detectLikelyTestFramework([...files, state.repoConfig.repoPath]);
  const feature = state.analysis?.affectedFeature ?? "reported workflow";

  return {
    framework,
    cases: [
      {
        name: `Regression: ${feature} failure path`,
        type: "regression",
        steps: [
          "Set up the same preconditions from the ticket.",
          "Execute the reported failing user or API flow.",
          "Assert the flow completes with the expected state instead of hanging/failing."
        ],
        expectedResult: "The reported failure no longer reproduces and the expected state is persisted or rendered."
      },
      {
        name: `Control: ${feature} normal path`,
        type: "control",
        steps: [
          "Run the closest existing successful path.",
          "Verify behavior remains unchanged after the proposed fix."
        ],
        expectedResult: "Existing successful behavior remains stable."
      }
    ],
    generatedArtifacts:
      files.length > 0
        ? files.slice(0, 3).map((file) => `Suggested test near ${file}`)
        : ["Manual verification checklist because no target files were selected."]
  };
}

function buildVerificationReport(state: TicketWorkflowState) {
  const files = state.codeContext?.relevantFiles.map((file) => file.filePath) ?? [];
  const framework = detectLikelyTestFramework([...files, state.repoConfig.repoPath]);
  const commands =
    framework.includes("npm")
      ? ["npm test", "npm run typecheck", "npm run build"]
      : framework === "Maven"
        ? ["mvn test", "mvn package -DskipTests=false"]
        : framework === "Gradle"
          ? ["./gradlew test", "./gradlew build"]
          : framework === "Ant"
            ? ["ant test", "ant build"]
            : [];

  return {
    status: "not_run" as const,
    commands:
      commands.length > 0
        ? commands.map((command) => ({
            command,
            status: "not_run" as const,
            reason: "Stored as verification plan; command execution requires a trusted repository execution step."
          }))
        : [
            {
              command: "manual verification",
              status: "not_run" as const,
              reason: "No standard test/build command was detected from selected context."
            }
          ],
    summary:
      commands.length > 0
        ? `Detected likely ${framework} verification commands but did not execute them automatically.`
        : "No automatic verification command was detected; use the generated manual checklist.",
    generatedAt: nowIso()
  };
}

function enrichFixProposalWithRepairArtifacts(fixProposal: FixProposal, state: TicketWorkflowState): FixProposal {
  return fixProposalSchema.parse({
    ...fixProposal,
    patchProposal: buildPatchProposal(state, fixProposal),
    testPlan: buildTestPlan(state),
    verificationReport: buildVerificationReport(state)
  });
}

async function buildFixProposalWithLlm(state: TicketWorkflowState): Promise<FixProposal> {
  const result = await callJsonChat({
    model: env.AI_MODEL_FIX_PROPOSAL,
    timeoutMs: 180000,
    messages: [
      {
        role: "system",
        content:
          "You are FixProposalAgent. Propose a constrained implementation approach for mentor review. Do not claim code was changed. Return JSON only with keys: title, hypotheses, recommendedApproach, steps, risks, verificationSteps, confidence. hypotheses, steps, risks, and verificationSteps must always be arrays of strings."
      },
      {
        role: "user",
        content: llmJson({
          ticket: state.ticket,
          analysis: state.analysis,
          priority: state.priority,
          codeContext: state.codeContext,
          memoryContext: state.codeContext?.memoryContext,
          graphContext: state.codeContext?.graphContext,
          requiredJsonShape: {
            title: "string",
            hypotheses: ["string"],
            recommendedApproach: "string",
            steps: ["string"],
            risks: ["string"],
            verificationSteps: ["string"],
            confidence: "number 0..1"
          }
        })
      }
    ]
  });

  return fixProposalSchema.parse(result);
}

function deterministicMentorDraft(state: TicketWorkflowState): MentorDraft {
  const priority = state.priority ? `${state.priority.level} priority` : "unclassified priority";
  const contextFiles = state.codeContext?.relevantFiles.map((file) => file.filePath).slice(0, 3) ?? [];
  const repairArtifacts = state.fixProposal
    ? [
        state.fixProposal.patchProposal
          ? `Patch proposal targets ${state.fixProposal.patchProposal.targetFiles.length} file(s) and is manual-review only.`
          : undefined,
        state.fixProposal.testPlan
          ? `Generated ${state.fixProposal.testPlan.cases.length} test case(s) for ${state.fixProposal.testPlan.framework}.`
          : undefined,
        state.fixProposal.verificationReport
          ? `Verification status: ${state.fixProposal.verificationReport.status}. ${state.fixProposal.verificationReport.summary}`
          : undefined
      ].filter(Boolean)
    : [];

  return mentorDraftSchema.parse({
    response: [
      `Ticket summary: ${state.analysis?.summary ?? summarizeText(state.ticket.description)}.`,
      `Current assessment: ${priority}. ${state.priority?.reason ?? ""}`.trim(),
      contextFiles.length > 0
        ? `Likely code context includes ${contextFiles.join(", ")}.`
        : "Repository context is not strong enough yet; mentor may need more information.",
      `Recommended next step: ${state.fixProposal?.recommendedApproach ?? "Review the ticket and confirm scope before implementation."}`,
      ...repairArtifacts
    ].join(" "),
    checklist: [
      "Confirm reproduction steps and affected environment.",
      "Review selected code context before approving implementation.",
      "Review the patch proposal and generated test plan before applying any code changes.",
      "Check verification status and decide whether trusted command execution is required.",
      "Validate proposed risks and verification steps.",
      "Decide whether more information is needed from the reporter."
    ],
    internalNotes: [
      "Draft is for mentor review only.",
      "No customer response has been sent automatically."
    ],
    generatedAt: nowIso()
  });
}

async function buildMentorDraftWithLlm(state: TicketWorkflowState): Promise<MentorDraft> {
  const result = await callJsonChat({
    model: env.AI_MODEL_MENTOR_DRAFT,
    timeoutMs: 180000,
    messages: [
      {
        role: "system",
        content:
          "You are MentorDraftAgent. Draft a concise mentor-review note using workflow outputs. Do not say the code is fixed. Do not send a customer response. Return JSON only with keys: response, checklist, internalNotes, generatedAt. checklist and internalNotes must always be arrays of strings."
      },
      {
        role: "user",
        content: llmJson({
          ticket: state.ticket,
          analysis: state.analysis,
          priority: state.priority,
          repoSearchSummary: {
            queryTerms: state.repoSearch?.queryTerms,
            resultCount: state.repoSearch?.results.length
          },
          codeContext: state.codeContext,
          fixProposal: state.fixProposal,
          repairArtifacts: {
            patchProposal: state.fixProposal?.patchProposal,
            testPlan: state.fixProposal?.testPlan,
            verificationReport: state.fixProposal?.verificationReport
          },
          requiredJsonShape: {
            response: "string",
            checklist: ["string"],
            internalNotes: ["optional string"],
            generatedAt: nowIso()
          }
        })
      }
    ]
  });

  return mentorDraftSchema.parse(result);
}

async function ticketAnalyzerNode(input: GraphInput): Promise<GraphInput> {
  const started = appendTrace(input.state, {
    agent: "TicketAnalyzerAgent",
    action: "Analyze incoming bug ticket",
    status: "started",
    inputSummary: summarizeText(input.state.ticket.description),
    inputPayload: getAgentInputPayload("TicketAnalyzerAgent", input.state),
    promptPreview: getAgentPromptPreview("TicketAnalyzerAgent", input.state)
  });

  try {
    if (started.status !== "created") {
      throw new Error(`TicketAnalyzerAgent expected status created but received ${started.status}`);
    }

    if (!started.ticket.description.trim()) {
      throw new Error("Ticket description is required");
    }

    let analysis: TicketAnalysis;
    let outputSummary: string;

    try {
      analysis = await analyzeTicketWithLlm(started);
      outputSummary = `LLM ${env.AI_MODEL_ANALYZER}: ${analysis.summary}`;
    } catch (llmError) {
      analysis = deterministicTicketAnalysis(started);
      outputSummary = `LLM fallback used: ${
        llmError instanceof Error ? llmError.message : "ticket analysis LLM failed"
      }. ${analysis.summary}`;
    }

    const completed = appendTrace(
      {
        ...started,
        status: "ticket_analyzed",
        analysis,
        updatedAt: nowIso()
      },
      {
        agent: "TicketAnalyzerAgent",
        action: "Stored ticket analysis",
        status: "completed",
        outputSummary,
        handoffPayload: analysis
      }
    );

    return { state: completed };
  } catch (error) {
    const failed = appendTrace(
      appendError(started, {
        agent: "TicketAnalyzerAgent",
        message: error instanceof Error ? error.message : "Ticket analysis failed",
        recoverable: false
      }),
      {
        agent: "TicketAnalyzerAgent",
        action: "Analyze incoming bug ticket",
        status: "failed",
        outputSummary: error instanceof Error ? error.message : "Ticket analysis failed"
      }
    );

    return { state: failed };
  }
}

async function priorityClassifierNode(input: GraphInput): Promise<GraphInput> {
  const started = appendTrace(input.state, {
    agent: "PriorityClassifierAgent",
    action: "Classify ticket priority",
    status: "started",
    inputSummary: input.state.analysis?.summary,
    inputPayload: getAgentInputPayload("PriorityClassifierAgent", input.state),
    promptPreview: getAgentPromptPreview("PriorityClassifierAgent", input.state)
  });

  try {
    if (started.status !== "ticket_analyzed") {
      throw new Error(`PriorityClassifierAgent expected status ticket_analyzed but received ${started.status}`);
    }

    if (!started.analysis) {
      throw new Error("Ticket analysis is required before priority classification");
    }

    let priority: PriorityClassification;
    let outputSummary: string;

    try {
      priority = await classifyPriorityWithLlm(started);
      outputSummary = `LLM ${env.AI_MODEL_PRIORITY}: ${priority.level}: ${priority.reason}`;
    } catch (llmError) {
      priority = classifyPriority(started);
      outputSummary = `LLM fallback used: ${
        llmError instanceof Error ? llmError.message : "priority classification LLM failed"
      }. ${priority.level}: ${priority.reason}`;
    }

    const completed = appendTrace(
      {
        ...started,
        status: "priority_classified",
        priority,
        updatedAt: nowIso()
      },
      {
        agent: "PriorityClassifierAgent",
        action: "Stored priority classification",
        status: "completed",
        outputSummary,
        handoffPayload: priority
      }
    );

    return { state: completed };
  } catch (error) {
    const failed = appendTrace(
      appendError(started, {
        agent: "PriorityClassifierAgent",
        message: error instanceof Error ? error.message : "Priority classification failed",
        recoverable: false
      }),
      {
        agent: "PriorityClassifierAgent",
        action: "Classify ticket priority",
        status: "failed",
        outputSummary: error instanceof Error ? error.message : "Priority classification failed"
      }
    );

    return { state: failed };
  }
}

async function repoSearchNode(input: GraphInput): Promise<GraphInput> {
  const started = appendTrace(input.state, {
    agent: "RepoSearchAgent",
    action: "Search repository context",
    status: "started",
    inputSummary: input.state.analysis?.summary,
    inputPayload: getAgentInputPayload("RepoSearchAgent", input.state),
    promptPreview: getAgentPromptPreview("RepoSearchAgent", input.state)
  });

  try {
    if (started.status !== "priority_classified") {
      throw new Error(`RepoSearchAgent expected status priority_classified but received ${started.status}`);
    }

    if (!started.analysis) {
      throw new Error("Ticket analysis is required before repository search");
    }

    if (!started.priority) {
      throw new Error("Priority classification is required before repository search");
    }

    if (!started.repoConfig.repositoryId || !started.repoConfig.repoPath) {
      throw new Error("Readable repository configuration is required");
    }

    const queryTerms = generateQueryTerms({
      ticketTitle: started.ticket.title,
      ticketDescription: started.ticket.description,
      analysis: started.analysis
    });
    const semanticQuery = generateSemanticQuery({
      ticketTitle: started.ticket.title,
      ticketDescription: started.ticket.description,
      analysis: started.analysis,
      priority: started.priority
    });
    const search = await repoSearchService.search({
      repositoryId: started.repoConfig.repositoryId,
      indexName: started.repoConfig.indexName,
      queryTerms,
      semanticQuery,
      strategy: started.repoConfig.retrievalStrategy,
      maxResults: started.repoConfig.maxResults,
      forceReindex: started.repoConfig.forceReindex
    });
    const repoSearch = repoSearchSchema.parse({
      queryTerms,
      semanticQuery,
      strategy: started.repoConfig.retrievalStrategy,
      indexStatus: search.indexStatus,
      results: search.results,
      dependencyGraph: search.dependencyGraph,
      memoryMatches: search.memoryMatches,
      searchedAt: nowIso(),
      warnings: search.warnings
    });
    const completed = appendTrace(
      {
        ...started,
        status: "repo_searched",
        repoSearch,
        updatedAt: nowIso()
      },
      {
        agent: "RepoSearchAgent",
        action: "Stored repository search results",
        status: "completed",
        outputSummary: `Found ${repoSearch.results.length} repository result(s)`,
        handoffPayload: {
          queryTerms: repoSearch.queryTerms,
          semanticQuery: repoSearch.semanticQuery,
          resultCount: repoSearch.results.length,
          topResults: repoSearch.results.slice(0, 5)
        }
      }
    );

    return { state: completed };
  } catch (error) {
    const failed = appendTrace(
      appendError(started, {
        agent: "RepoSearchAgent",
        message: error instanceof Error ? error.message : "Repository search failed",
        recoverable: false
      }),
      {
        agent: "RepoSearchAgent",
        action: "Search repository context",
        status: "failed",
        outputSummary: error instanceof Error ? error.message : "Repository search failed"
      }
    );

    return { state: failed };
  }
}

async function codeContextNode(input: GraphInput): Promise<GraphInput> {
  const started = appendTrace(input.state, {
    agent: "CodeContextAgent",
    action: "Select focused code context",
    status: "started",
    inputSummary: input.state.repoSearch?.semanticQuery,
    inputPayload: getAgentInputPayload("CodeContextAgent", input.state),
    promptPreview: getAgentPromptPreview("CodeContextAgent", input.state)
  });

  try {
    if (started.status !== "repo_searched") {
      throw new Error(`CodeContextAgent expected status repo_searched but received ${started.status}`);
    }

    if (!started.repoSearch) {
      throw new Error("Repository search results are required before code context selection");
    }

    let codeContext: CodeContext;
    let outputSummary: string;

    try {
      codeContext = await buildCodeContextWithLlm(started);
      outputSummary = `LLM ${env.AI_MODEL_CODE_CONTEXT}: ${codeContext.summary}`;
    } catch (llmError) {
      codeContext = deterministicCodeContext(started);
      outputSummary = `LLM fallback used: ${
        llmError instanceof Error ? llmError.message : "code context LLM failed"
      }. ${codeContext.summary}`;
    }
    codeContext = enrichCodeContextWithRepoIntelligence(codeContext, started);

    const completed = appendTrace(
      {
        ...started,
        status: "code_context_ready",
        codeContext,
        updatedAt: nowIso()
      },
      {
        agent: "CodeContextAgent",
        action: "Stored focused code context",
        status: "completed",
        outputSummary,
        handoffPayload: codeContext
      }
    );

    return { state: completed };
  } catch (error) {
    const failed = appendTrace(
      appendError(started, {
        agent: "CodeContextAgent",
        message: error instanceof Error ? error.message : "Code context selection failed",
        recoverable: false
      }),
      {
        agent: "CodeContextAgent",
        action: "Select focused code context",
        status: "failed",
        outputSummary: error instanceof Error ? error.message : "Code context selection failed"
      }
    );

    return { state: failed };
  }
}

async function fixProposalNode(input: GraphInput): Promise<GraphInput> {
  const started = appendTrace(input.state, {
    agent: "FixProposalAgent",
    action: "Draft fix proposal",
    status: "started",
    inputSummary: input.state.codeContext?.summary,
    inputPayload: getAgentInputPayload("FixProposalAgent", input.state),
    promptPreview: getAgentPromptPreview("FixProposalAgent", input.state)
  });

  try {
    if (started.status !== "code_context_ready") {
      throw new Error(`FixProposalAgent expected status code_context_ready but received ${started.status}`);
    }

    if (!started.codeContext) {
      throw new Error("Code context is required before fix proposal generation");
    }

    let fixProposal: FixProposal;
    let outputSummary: string;

    try {
      fixProposal = await buildFixProposalWithLlm(started);
      outputSummary = `LLM ${env.AI_MODEL_FIX_PROPOSAL}: ${fixProposal.title}`;
    } catch (llmError) {
      fixProposal = deterministicFixProposal(started);
      outputSummary = `LLM fallback used: ${
        llmError instanceof Error ? llmError.message : "fix proposal LLM failed"
      }. ${fixProposal.title}`;
    }
    fixProposal = enrichFixProposalWithRepairArtifacts(fixProposal, started);

    const completed = appendTrace(
      {
        ...started,
        status: "fix_proposed",
        fixProposal,
        updatedAt: nowIso()
      },
      {
        agent: "FixProposalAgent",
        action: "Stored fix proposal",
        status: "completed",
        outputSummary,
        handoffPayload: fixProposal
      }
    );

    return { state: completed };
  } catch (error) {
    const failed = appendTrace(
      appendError(started, {
        agent: "FixProposalAgent",
        message: error instanceof Error ? error.message : "Fix proposal generation failed",
        recoverable: false
      }),
      {
        agent: "FixProposalAgent",
        action: "Draft fix proposal",
        status: "failed",
        outputSummary: error instanceof Error ? error.message : "Fix proposal generation failed"
      }
    );

    return { state: failed };
  }
}

async function mentorDraftNode(input: GraphInput): Promise<GraphInput> {
  const started = appendTrace(input.state, {
    agent: "MentorDraftAgent",
    action: "Draft mentor review note",
    status: "started",
    inputSummary: input.state.fixProposal?.title,
    inputPayload: getAgentInputPayload("MentorDraftAgent", input.state),
    promptPreview: getAgentPromptPreview("MentorDraftAgent", input.state)
  });

  try {
    if (started.status !== "fix_proposed") {
      throw new Error(`MentorDraftAgent expected status fix_proposed but received ${started.status}`);
    }

    if (!started.fixProposal) {
      throw new Error("Fix proposal is required before mentor draft generation");
    }

    let mentorDraft: MentorDraft;
    let outputSummary: string;

    try {
      mentorDraft = await buildMentorDraftWithLlm(started);
      outputSummary = `LLM ${env.AI_MODEL_MENTOR_DRAFT}: ${summarizeText(mentorDraft.response)}`;
    } catch (llmError) {
      mentorDraft = deterministicMentorDraft(started);
      outputSummary = `LLM fallback used: ${
        llmError instanceof Error ? llmError.message : "mentor draft LLM failed"
      }. ${summarizeText(mentorDraft.response)}`;
    }

    const completed = appendTrace(
      {
        ...started,
        status: "mentor_draft_ready",
        mentorDraft,
        updatedAt: nowIso()
      },
      {
        agent: "MentorDraftAgent",
        action: "Stored mentor draft for developer confirmation",
        status: "completed",
        outputSummary,
        handoffPayload: mentorDraft
      }
    );

    return { state: completed };
  } catch (error) {
    const failed = appendTrace(
      appendError(started, {
        agent: "MentorDraftAgent",
        message: error instanceof Error ? error.message : "Mentor draft generation failed",
        recoverable: false
      }),
      {
        agent: "MentorDraftAgent",
        action: "Draft mentor review note",
        status: "failed",
        outputSummary: error instanceof Error ? error.message : "Mentor draft generation failed"
      }
    );

    return { state: failed };
  }
}

function nextOrEnd(input: GraphInput) {
  return input.state.status === "failed" ? END : "next";
}

const compiledWorkflowGraph = new StateGraph(WorkflowAnnotation)
  .addNode("ticketAnalyzerNode", ticketAnalyzerNode)
  .addNode("priorityClassifierNode", priorityClassifierNode)
  .addNode("repoSearchNode", repoSearchNode)
  .addNode("codeContextNode", codeContextNode)
  .addNode("fixProposalNode", fixProposalNode)
  .addNode("mentorDraftNode", mentorDraftNode)
  .addEdge(START, "ticketAnalyzerNode")
  .addConditionalEdges("ticketAnalyzerNode", nextOrEnd, {
    next: "priorityClassifierNode",
    [END]: END
  })
  .addConditionalEdges("priorityClassifierNode", nextOrEnd, {
    next: "repoSearchNode",
    [END]: END
  })
  .addConditionalEdges("repoSearchNode", nextOrEnd, {
    next: "codeContextNode",
    [END]: END
  })
  .addConditionalEdges("codeContextNode", nextOrEnd, {
    next: "fixProposalNode",
    [END]: END
  })
  .addConditionalEdges("fixProposalNode", nextOrEnd, {
    next: "mentorDraftNode",
    [END]: END
  })
  .addEdge("mentorDraftNode", END)
  .compile();

export async function runTicketWorkflow(initialState: TicketWorkflowState) {
  const result = await compiledWorkflowGraph.invoke({ state: initialState });
  return result.state;
}

export const workflowAgentSequence = [
  {
    name: "TicketAnalyzerAgent",
    type: "TICKET_ANALYZER",
    expectedStatus: "created",
    completedStatus: "ticket_analyzed",
    node: ticketAnalyzerNode
  },
  {
    name: "PriorityClassifierAgent",
    type: "PRIORITY_CLASSIFIER",
    expectedStatus: "ticket_analyzed",
    completedStatus: "priority_classified",
    node: priorityClassifierNode
  },
  {
    name: "RepoSearchAgent",
    type: "REPO_SEARCH",
    expectedStatus: "priority_classified",
    completedStatus: "repo_searched",
    node: repoSearchNode
  },
  {
    name: "CodeContextAgent",
    type: "CODE_CONTEXT",
    expectedStatus: "repo_searched",
    completedStatus: "code_context_ready",
    node: codeContextNode
  },
  {
    name: "FixProposalAgent",
    type: "FIX_PROPOSAL",
    expectedStatus: "code_context_ready",
    completedStatus: "fix_proposed",
    node: fixProposalNode
  },
  {
    name: "MentorDraftAgent",
    type: "MENTOR_DRAFT",
    expectedStatus: "fix_proposed",
    completedStatus: "mentor_draft_ready",
    node: mentorDraftNode
  }
] as const;

export type WorkflowAgentType = (typeof workflowAgentSequence)[number]["type"];

export function getNextWorkflowAgent(status: TicketWorkflowState["status"]) {
  return workflowAgentSequence.find((agent) => agent.expectedStatus === status) ?? null;
}

export function getAgentForCompletedStatus(status: TicketWorkflowState["status"]) {
  return workflowAgentSequence.find((agent) => agent.completedStatus === status) ?? null;
}

export async function runNextWorkflowAgent(state: TicketWorkflowState) {
  const nextAgent = getNextWorkflowAgent(state.status);

  if (!nextAgent) {
    throw new Error(`No next agent is available for workflow status ${state.status}`);
  }

  const result = await nextAgent.node({ state });
  return result.state;
}

export async function rerunCompletedWorkflowAgent(state: TicketWorkflowState) {
  const failedTrace = state.status === "failed" ? [...state.trace].reverse().find((entry) => entry.status === "failed") : null;
  const agent =
    failedTrace
      ? workflowAgentSequence.find((item) => item.name === failedTrace.agent)
      : getAgentForCompletedStatus(state.status);

  if (!agent) {
    throw new Error(`No completed agent can be rerun for workflow status ${state.status}`);
  }

  const rerunState = {
    ...state,
    status: agent.expectedStatus,
    trace: state.trace.filter((entry) => entry.agent !== agent.name),
    updatedAt: nowIso()
  };
  const result = await agent.node({ state: rerunState });
  return result.state;
}
