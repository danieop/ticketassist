# Workflow State Guide

Workflow State là nguồn dữ liệu trung tâm của toàn bộ quá trình.

## Status Gợi Ý

```ts
type WorkflowStatus =
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
```

Final state sau khi AI chạy xong nên là `waiting_for_review`, không phải `completed_fix`.

## Schema Gợi Ý

```ts
interface WorkflowState {
  id: string;
  status: WorkflowStatus;
  ticket: TicketInput;
  analysis?: TicketAnalysis;
  priority?: PriorityClassification;
  repoSearch?: RepoSearchResult;
  codeContext?: CodeContextItem[];
  fixProposal?: FixProposal;
  mentorDraft?: MentorDraft;
  mentorReview?: MentorReview;
  trace: AgentTraceEntry[];
  error?: WorkflowError;
  createdAt: string;
  updatedAt: string;
}
```

## Trace Gợi Ý

```ts
interface AgentTraceEntry {
  agent: string;
  status: "pending" | "running" | "success" | "failed";
  message: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
}
```

Trace giúp Mentor biết agent nào đã tạo ra kết quả nào và workflow fail ở đâu.
