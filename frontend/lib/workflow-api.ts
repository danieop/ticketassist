"use client";

export type WorkflowStatus =
  | "created"
  | "ticket_analyzed"
  | "priority_classified"
  | "repo_searched"
  | "code_context_ready"
  | "fix_proposed"
  | "mentor_draft_ready"
  | "waiting_for_review"
  | "reviewed"
  | "failed";

export type ReviewDecision = "APPROVED" | "REJECTED" | "NEED_MORE_INFORMATION";
export type TicketSource = "EMAIL" | "SLACK" | "ZENDESK" | "JIRA" | "MANUAL";

export type WorkflowApi = {
  id: string;
  status: WorkflowStatus;
  startedAt: string;
  finishedAt?: string | null;
  currentAgent?: string | null;
  progress?: {
    completedAgentCount: number;
    totalAgentCount: number;
    percent: number;
  };
  nextAgent?: {
    name: string;
    type: string;
  } | null;
  workflowMeta?: {
    edits?: {
      agentType?: string;
      note?: string;
      createdAt?: string;
    }[];
    reruns?: {
      agentType?: string;
      invalidatedAgentTypes?: string[];
      createdAt?: string;
    }[];
    reviewRequests?: {
      decision?: ReviewDecision;
      comment?: string;
      createdAt?: string;
    }[];
    promptVersions?: unknown[];
    outputVersions?: unknown[];
    staleAgentTypes?: string[];
  };
  requiresDeveloperDecision?: boolean;
  ticket: {
    id: string;
    title: string;
    description: string;
    reporterName: string;
    source: TicketSource;
    createdAt: string;
  };
  repository?: {
    id: string;
    name: string;
    rootPath: string;
    status: string;
    fileCount: number;
  } | null;
  state?: {
    ticketAnalysis?: {
      summary?: string;
      keyFacts?: string[];
      affectedFeature?: string;
      suspectedFlow?: string;
      missingInfo?: string[];
    } | null;
    priorityClassification?: {
      level?: string;
      reason?: string;
      confidence?: number;
      severity?: string;
      businessImpact?: string;
    } | null;
    repoSearchResults?: {
      queryTerms?: string[];
      semanticQuery?: string;
      dependencyGraph?: {
        nodes: {
          id: string;
          label: string;
          kind: string;
          filePath: string;
          layer?: string;
        }[];
        edges: {
          from: string;
          to: string;
          type: string;
        }[];
      };
      memoryMatches?: {
        workflowRunId: string;
        ticketId: string;
        title: string;
        score: number;
        matchedSignals: string[];
        fixTitle?: string;
      }[];
      results?: {
        filePath: string;
        score: number;
        matchType: string;
        startLine?: number;
        endLine?: number;
        snippet?: string;
      }[];
    } | null;
    codeContext?: {
      summary?: string;
      relevantFiles?: {
        filePath: string;
        startLine?: number;
        endLine?: number;
        relevanceScore: number;
        reason: string;
        excerpt?: string;
        riskNotes?: string[];
      }[];
      riskNotes?: string[];
      graphContext?: {
        nodes: string[];
        edges: string[];
        summary: string;
      };
      memoryContext?: {
        summary: string;
        matches: {
          workflowRunId: string;
          title: string;
          score: number;
          matchedSignals: string[];
        }[];
      };
    } | null;
    fixProposal?: {
      title?: string;
      hypotheses?: string[];
      recommendedApproach?: string;
      steps?: string[];
      risks?: string[];
      verificationSteps?: string[];
      patchProposal?: {
        strategy: string;
        targetFiles: string[];
        proposedDiff: string;
        applyMode: "manual_review";
        confidence: number;
      };
      testPlan?: {
        framework: string;
        cases: {
          name: string;
          type: string;
          steps: string[];
          expectedResult: string;
        }[];
        generatedArtifacts: string[];
      };
      verificationReport?: {
        status: "pass" | "fail" | "partial" | "not_run";
        commands: {
          command: string;
          status: "pass" | "fail" | "not_run";
          reason?: string;
        }[];
        summary: string;
      };
      confidence?: number;
    } | null;
    mentorDraft?: {
      response?: string;
      checklist?: string[];
      internalNotes?: string[];
    } | null;
  } | null;
  agents: {
    id: string;
    status: "success" | "failed" | "running" | "pending";
    agent: {
      name: string;
      type: string;
      executionOrder: number;
    };
    inputSnapshot?: unknown;
    outputSnapshot?: unknown;
    errorMessage?: string | null;
    startedAt: string;
    finishedAt?: string | null;
  }[];
  trace: {
    id: string;
    agentRunId?: string | null;
    level: "DEBUG" | "INFO" | "WARN" | "ERROR";
    message: string;
    metadata?: {
      outputSummary?: string;
      inputSummary?: string;
      inputPayload?: unknown;
      handoffPayload?: unknown;
      promptPreview?: string;
      agent?: string;
      action?: string;
      status?: string;
    } | null;
    createdAt: string;
  }[];
  mentorReview?: {
    decision: ReviewDecision;
    comment: string;
    reviewedAt: string;
    mentor?: {
      name: string;
      email: string;
    };
  } | null;
};

export type WorkflowSummaryApi = {
  id: string;
  status: WorkflowStatus;
  startedAt: string;
  finishedAt?: string | null;
  currentAgent?: string | null;
  progress?: {
    completedAgentCount: number;
    totalAgentCount: number;
    percent: number;
  };
  nextAgent?: {
    name: string;
    type: string;
  } | null;
  workflowMeta?: WorkflowApi["workflowMeta"];
  requiresDeveloperDecision?: boolean;
  ticket: {
    id: string;
    title: string;
    reporterName: string;
    source: TicketSource;
    createdAt: string;
  };
  repository?: {
    id: string;
    name: string;
    status: string;
    fileCount: number;
  } | null;
  mentorReview?: {
    decision: ReviewDecision;
    reviewedAt: string;
  } | null;
};

export type WorkflowSummaryPageApi = {
  items: WorkflowSummaryApi[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type WorkflowDashboardApi = {
  workflowsByStatus: Record<string, number>;
  averageAgentLatencyMs: number;
  agentLatencyByType: Record<string, number>;
  fallbackRate: number;
  fallbackCount: number;
  rerunCount: number;
  editCount: number;
  mentorDecisions: Record<string, number>;
  queue: {
    pending: number;
    pendingJobs: {
      id: string;
      workflowRunId: string;
      label: string;
      createdAt: string;
    }[];
    active?: {
      id?: string;
      workflowRunId: string;
      label: string;
      createdAt?: string;
    } | null;
    completed: unknown[];
    failed: unknown[];
  };
};

export const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export async function getResponseErrorMessage(response: Response) {
  const body = (await response.json().catch(() => null)) as {
    message?: string;
    issues?: { message?: string }[];
  } | null;

  return body?.issues?.[0]?.message ?? body?.message ?? "Request failed";
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
