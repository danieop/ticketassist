import { z } from "zod";
import { redactPayload, redactText } from "./redaction.service.js";

export const workflowStatusSchema = z.enum([
  "created",
  "ticket_analyzed",
  "priority_classified",
  "repo_searched",
  "code_context_ready",
  "fix_proposed",
  "mentor_draft_ready",
  "waiting_for_review",
  "failed"
]);

export const retrievalStrategySchema = z.enum(["keyword", "vector", "hybrid"]);

export const ticketAnalysisSchema = z.object({
  summary: z.string().min(1),
  keyFacts: z.array(z.string()),
  affectedFeature: z.string().optional(),
  suspectedFlow: z.string().optional(),
  missingInfo: z.array(z.string()).optional()
});

export const priorityClassificationSchema = z.object({
  level: z.enum(["low", "medium", "high", "critical"]),
  reason: z.string().min(1),
  confidence: z.number().min(0).max(1),
  severity: z.enum(["minor", "major", "critical"]).optional(),
  businessImpact: z.string().optional()
});

export const repoSearchResultSchema = z.object({
  filePath: z.string(),
  score: z.number(),
  matchType: z.enum(["filename", "keyword", "semantic", "hybrid"]),
  chunkId: z.string().optional(),
  startLine: z.number().int().optional(),
  endLine: z.number().int().optional(),
  matchedLines: z
    .array(
      z.object({
        lineNumber: z.number().int(),
        text: z.string()
      })
    )
    .optional(),
  snippet: z.string().optional(),
  symbols: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const dependencyGraphSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      kind: z.string(),
      filePath: z.string(),
      startLine: z.number().int().optional(),
      endLine: z.number().int().optional(),
      language: z.string().optional(),
      layer: z.string().optional(),
      confidence: z.number().min(0).max(1).optional()
    })
  ),
  edges: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      type: z.string(),
      confidence: z.number().min(0).max(1).optional(),
      evidence: z.string().optional()
    })
  ),
  generatedAt: z.string()
});

export const ticketMemoryMatchSchema = z.object({
  workflowRunId: z.string(),
  ticketId: z.string(),
  title: z.string(),
  score: z.number(),
  status: z.string(),
  matchedSignals: z.array(z.string()),
  summary: z.string().optional(),
  fixTitle: z.string().optional(),
  reviewedDecision: z.string().optional()
});

export const repoSearchSchema = z.object({
  queryTerms: z.array(z.string()),
  semanticQuery: z.string(),
  strategy: retrievalStrategySchema,
  indexStatus: z.object({
    indexName: z.string(),
    exists: z.boolean(),
    builtOrUpdated: z.boolean(),
    chunkingVersion: z.string().optional(),
    indexedFiles: z.number().int().optional(),
    indexedChunks: z.number().int().optional(),
    embeddingModel: z.string().optional(),
    vectorStore: z.literal("postgresql_pgvector")
  }),
  results: z.array(repoSearchResultSchema),
  dependencyGraph: dependencyGraphSchema.optional(),
  memoryMatches: z.array(ticketMemoryMatchSchema).optional(),
  searchedAt: z.string(),
  warnings: z.array(z.string()).optional()
});

const stringArraySchema = z.preprocess((value) => {
  if (typeof value === "string") {
    return [value];
  }

  return value;
}, z.array(z.string()));

export const codeContextFileSchema = z.object({
  filePath: z.string(),
  startLine: z.number().int().optional(),
  endLine: z.number().int().optional(),
  relevanceScore: z.number(),
  reason: z.string(),
  matchedTerms: stringArraySchema.optional(),
  excerpt: z.string().optional(),
  riskNotes: stringArraySchema.optional()
});

export const codeContextSchema = z.object({
  summary: z.string().min(1),
  relevantFiles: z.array(codeContextFileSchema),
  riskNotes: stringArraySchema,
  graphContext: z
    .object({
      nodes: z.array(z.string()),
      edges: z.array(z.string()),
      summary: z.string()
    })
    .optional(),
  memoryContext: z
    .object({
      matches: z.array(ticketMemoryMatchSchema),
      summary: z.string()
    })
    .optional(),
  generatedAt: z.string()
});

export const fixProposalSchema = z.object({
  title: z.string().min(1),
  hypotheses: stringArraySchema,
  recommendedApproach: z.string().min(1),
  steps: stringArraySchema,
  risks: stringArraySchema,
  verificationSteps: stringArraySchema,
  patchProposal: z
    .object({
      strategy: z.string(),
      targetFiles: z.array(z.string()),
      proposedDiff: z.string(),
      applyMode: z.literal("manual_review"),
      confidence: z.number().min(0).max(1)
    })
    .optional(),
  testPlan: z
    .object({
      framework: z.string(),
      cases: z.array(
        z.object({
          name: z.string(),
          type: z.string(),
          steps: z.array(z.string()),
          expectedResult: z.string()
        })
      ),
      generatedArtifacts: z.array(z.string())
    })
    .optional(),
  verificationReport: z
    .object({
      status: z.enum(["pass", "fail", "partial", "not_run"]),
      commands: z.array(
        z.object({
          command: z.string(),
          status: z.enum(["pass", "fail", "not_run"]),
          reason: z.string().optional()
        })
      ),
      summary: z.string(),
      generatedAt: z.string()
    })
    .optional(),
  confidence: z.number().min(0).max(1)
});

export const mentorDraftSchema = z.object({
  response: z.string().min(1),
  checklist: stringArraySchema,
  internalNotes: stringArraySchema.optional(),
  generatedAt: z.string()
});

export type WorkflowStatus = z.infer<typeof workflowStatusSchema>;
export type RetrievalStrategy = z.infer<typeof retrievalStrategySchema>;
export type TicketAnalysis = z.infer<typeof ticketAnalysisSchema>;
export type PriorityClassification = z.infer<typeof priorityClassificationSchema>;
export type RepoSearchResult = z.infer<typeof repoSearchResultSchema>;
export type RepoSearch = z.infer<typeof repoSearchSchema>;
export type CodeContext = z.infer<typeof codeContextSchema>;
export type FixProposal = z.infer<typeof fixProposalSchema>;
export type MentorDraft = z.infer<typeof mentorDraftSchema>;

export type WorkflowError = {
  agent: string;
  message: string;
  recoverable: boolean;
  createdAt: string;
};

export type WorkflowTraceEntry = {
  agent: string;
  action: string;
  status: "started" | "completed" | "failed";
  inputSummary?: string;
  outputSummary?: string;
  inputPayload?: unknown;
  handoffPayload?: unknown;
  promptPreview?: string;
  createdAt: string;
};

export type TicketWorkflowState = {
  id: string;
  status: WorkflowStatus;
  ticket: {
    title?: string;
    description: string;
    metadata?: Record<string, unknown>;
  };
  repoConfig: {
    repositoryId: string;
    repoPath: string;
    maxResults: number;
    retrievalStrategy: RetrievalStrategy;
    indexName: string;
    forceReindex: boolean;
  };
  analysis?: TicketAnalysis;
  priority?: PriorityClassification;
  repoSearch?: RepoSearch;
  codeContext?: CodeContext;
  fixProposal?: FixProposal;
  mentorDraft?: MentorDraft;
  errors: WorkflowError[];
  trace: WorkflowTraceEntry[];
  workflowMeta?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export function nowIso() {
  return new Date().toISOString();
}

export function appendTrace(
  state: TicketWorkflowState,
  entry: Omit<WorkflowTraceEntry, "createdAt">
) {
  const redactedEntry = redactPayload(entry);

  return {
    ...state,
    trace: [...state.trace, { ...redactedEntry, createdAt: nowIso() }],
    updatedAt: nowIso()
  };
}

export function appendError(
  state: TicketWorkflowState,
  error: Omit<WorkflowError, "createdAt">
) {
  return {
    ...state,
    status: "failed" as const,
    errors: [...state.errors, { ...error, message: redactText(error.message), createdAt: nowIso() }],
    updatedAt: nowIso()
  };
}
