import type { TraceStatus, WorkflowStatus } from "@/types/workflow";

const statusLabels: Record<WorkflowStatus | TraceStatus, string> = {
  created: "Created",
  ticket_analyzed: "Ticket analyzed",
  priority_classified: "Priority classified",
  repo_searched: "Repo searched",
  code_context_ready: "Code context ready",
  fix_proposed: "Fix proposed",
  mentor_draft_ready: "Mentor draft ready",
  waiting_for_review: "Waiting for review",
  reviewed: "Reviewed",
  failed: "Failed",
  pending: "Pending",
  running: "Running",
  success: "Success"
};

export function StatusBadge({ status }: { status: WorkflowStatus | TraceStatus }) {
  return <span className={`status-badge status-${status}`}>{statusLabels[status]}</span>;
}
