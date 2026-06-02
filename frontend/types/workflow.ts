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

export type TraceStatus = "pending" | "running" | "success" | "failed";

export interface TicketInput {
  id: string;
  title: string;
  description: string;
  customer: string;
  environment: "production" | "staging" | "development";
  channel: "Email" | "Slack" | "Zendesk" | "Jira";
  createdAt: string;
}

export interface TicketAnalysis {
  summary: string;
  symptoms: string[];
  missingInfo: string[];
}

export interface PriorityClassification {
  level: "P0" | "P1" | "P2" | "P3";
  reason: string;
  impact: string;
}

export interface RepoSearchResult {
  query: string;
  files: string[];
}

export interface CodeContextItem {
  file: string;
  note: string;
}

export interface FixProposal {
  title: string;
  steps: string[];
  risks: string[];
}

export interface MentorDraft {
  response: string;
  checklist: string[];
}

export interface AgentTraceEntry {
  agent: string;
  status: TraceStatus;
  message: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
}

export interface WorkflowState {
  id: string;
  status: WorkflowStatus;
  ticket: TicketInput;
  analysis?: TicketAnalysis;
  priority?: PriorityClassification;
  repoSearch?: RepoSearchResult;
  codeContext?: CodeContextItem[];
  fixProposal?: FixProposal;
  mentorDraft?: MentorDraft;
  trace: AgentTraceEntry[];
  createdAt: string;
  updatedAt: string;
}
