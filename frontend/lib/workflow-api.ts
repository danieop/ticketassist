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
    } | null;
    fixProposal?: {
      title?: string;
      hypotheses?: string[];
      recommendedApproach?: string;
      steps?: string[];
      risks?: string[];
      verificationSteps?: string[];
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
    errorMessage?: string | null;
    startedAt: string;
    finishedAt?: string | null;
  }[];
  trace: {
    id: string;
    level: "DEBUG" | "INFO" | "WARN" | "ERROR";
    message: string;
    metadata?: {
      outputSummary?: string;
      inputSummary?: string;
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

