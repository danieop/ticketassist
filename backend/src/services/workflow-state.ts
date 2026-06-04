import { z } from "zod";

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

export const repoSearchSchema = z.object({
  queryTerms: z.array(z.string()),
  semanticQuery: z.string(),
  strategy: retrievalStrategySchema,
  indexStatus: z.object({
    indexName: z.string(),
    exists: z.boolean(),
    builtOrUpdated: z.boolean(),
    indexedFiles: z.number().int().optional(),
    indexedChunks: z.number().int().optional(),
    embeddingModel: z.string().optional(),
    vectorStore: z.literal("postgresql_pgvector")
  }),
  results: z.array(repoSearchResultSchema),
  searchedAt: z.string(),
  warnings: z.array(z.string()).optional()
});

export const codeContextFileSchema = z.object({
  filePath: z.string(),
  startLine: z.number().int().optional(),
  endLine: z.number().int().optional(),
  relevanceScore: z.number(),
  reason: z.string(),
  matchedTerms: z.array(z.string()).optional(),
  excerpt: z.string().optional(),
  riskNotes: z.array(z.string()).optional()
});

export const codeContextSchema = z.object({
  summary: z.string().min(1),
  relevantFiles: z.array(codeContextFileSchema),
  riskNotes: z.array(z.string()),
  generatedAt: z.string()
});

export const fixProposalSchema = z.object({
  title: z.string().min(1),
  hypotheses: z.array(z.string()),
  recommendedApproach: z.string().min(1),
  steps: z.array(z.string()),
  risks: z.array(z.string()),
  verificationSteps: z.array(z.string()),
  confidence: z.number().min(0).max(1)
});

export const mentorDraftSchema = z.object({
  response: z.string().min(1),
  checklist: z.array(z.string()),
  internalNotes: z.array(z.string()).optional(),
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
  return {
    ...state,
    trace: [...state.trace, { ...entry, createdAt: nowIso() }],
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
    errors: [...state.errors, { ...error, createdAt: nowIso() }],
    updatedAt: nowIso()
  };
}
