"use client";

import { useEffect, useMemo, useState } from "react";
import { LoadingSpinner } from "./loading-spinner";
import { StatusBadge } from "./status-badge";
import {
  apiBaseUrl,
  formatDateTime,
  getResponseErrorMessage,
  type ReviewDecision,
  type WorkflowApi
} from "@/lib/workflow-api";
import { getAuthHeaders } from "@/lib/auth-client";

const reviewDecisions: { value: ReviewDecision; label: string }[] = [
  { value: "APPROVED", label: "Approve" },
  { value: "REJECTED", label: "Reject" },
  { value: "NEED_MORE_INFORMATION", label: "Request changes" }
];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request failed";
}

function getStoredMentorId() {
  try {
    const rawUser = localStorage.getItem("ticketassist_user");

    if (!rawUser) {
      return undefined;
    }

    const user = JSON.parse(rawUser) as { id?: string; role?: string };
    return user.role === "MENTOR" ? user.id : undefined;
  } catch {
    return undefined;
  }
}

export function MentorReviewQueue() {
  const [workflows, setWorkflows] = useState<WorkflowApi[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");
  const [decision, setDecision] = useState<ReviewDecision>("APPROVED");
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  const selectedWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.id === selectedWorkflowId) ?? workflows[0] ?? null,
    [workflows, selectedWorkflowId]
  );

  const loadQueue = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/workflows?status=waiting_for_review&limit=50`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response));
      }

      const data = (await response.json()) as WorkflowApi[];
      setWorkflows(data);

      if (!selectedWorkflowId && data[0]) {
        setSelectedWorkflowId(data[0].id);
      }

      setMessage(data.length === 0 ? "No workflows waiting for mentor review." : `Loaded ${data.length} review item(s).`);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadQueue();
  }, []);

  const submitReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedWorkflow) {
      return;
    }

    setIsReviewing(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/workflows/${selectedWorkflow.id}/review`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          decision,
          comment: comment.trim(),
          mentorId: getStoredMentorId()
        })
      });

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response));
      }

      const reviewedWorkflow = (await response.json()) as WorkflowApi;
      setWorkflows((current) => current.filter((workflow) => workflow.id !== reviewedWorkflow.id));
      setSelectedWorkflowId("");
      setComment("");
      setDecision("APPROVED");
      setMessage(
        decision === "NEED_MORE_INFORMATION"
          ? "Changes requested. The workflow was returned to the developer."
          : `Review submitted: ${reviewedWorkflow.mentorReview?.decision ?? decision}.`
      );
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsReviewing(false);
    }
  };

  const analysis = selectedWorkflow?.state?.ticketAnalysis;
  const priority = selectedWorkflow?.state?.priorityClassification;
  const codeContext = selectedWorkflow?.state?.codeContext;
  const fixProposal = selectedWorkflow?.state?.fixProposal;
  const mentorDraft = selectedWorkflow?.state?.mentorDraft;

  return (
    <section className="mentor-queue-shell">
      <div className="mentor-queue-grid">
        <aside className="panel mentor-queue-list-panel">
          <div className="panel-heading row-heading">
            <div>
              <p className="eyebrow">Review queue</p>
              <h2>{workflows.length} pending</h2>
            </div>
            <button className="secondary-action compact-action" disabled={isLoading} onClick={() => void loadQueue()} type="button">
              {isLoading ? <LoadingSpinner /> : null}
              {isLoading ? "Loading" : "Refresh"}
            </button>
          </div>
          <div className="mentor-queue-list">
            {workflows.map((workflow) => (
              <button
                className={`mentor-queue-item ${workflow.id === selectedWorkflow?.id ? "mentor-queue-item-active" : ""}`}
                key={workflow.id}
                onClick={() => setSelectedWorkflowId(workflow.id)}
                type="button"
              >
                <span>{workflow.ticket.source}</span>
                <strong>{workflow.ticket.title}</strong>
                <small>{workflow.ticket.reporterName} - {formatDateTime(workflow.startedAt)}</small>
                <StatusBadge status={workflow.status} />
              </button>
            ))}
            {workflows.length === 0 ? <p className="muted-text">The review queue is clear.</p> : null}
          </div>
        </aside>

        <section className="panel mentor-review-detail">
          {selectedWorkflow ? (
            <>
              <div className="panel-heading row-heading">
                <div>
                  <p className="eyebrow">Mentor review</p>
                  <h2>{selectedWorkflow.ticket.title}</h2>
                </div>
                <StatusBadge status={selectedWorkflow.status} />
              </div>

              {message ? <p className="repo-status-message">{message}</p> : null}

              <div className="mentor-review-layout">
                <div className="mentor-review-main">
                  <article className="review-section">
                    <h3>Draft</h3>
                    <div className="draft-box">
                      <p>{mentorDraft?.response}</p>
                    </div>
                  </article>

                  <article className="review-section">
                    <h3>Fix proposal</h3>
                    <p className="muted-text">{fixProposal?.recommendedApproach}</p>
                    <ul className="clean-list">
                      {(fixProposal?.steps ?? []).map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ul>
                  </article>

                  <article className="review-section">
                    <h3>Code context</h3>
                    <div className="context-list">
                      {(codeContext?.relevantFiles ?? []).slice(0, 5).map((file) => (
                        <div key={`${file.filePath}-${file.startLine ?? 0}`}>
                          <strong>{file.filePath}{file.startLine ? `:${file.startLine}` : ""}</strong>
                          <p>{file.reason}</p>
                        </div>
                      ))}
                    </div>
                  </article>
                </div>

                <aside className="mentor-decision-panel">
                  <div className="decision-summary">
                    <span>Priority</span>
                    <strong>{priority?.level ?? "Unknown"}</strong>
                    <p>{priority?.reason}</p>
                  </div>
                  <div className="decision-summary">
                    <span>Analysis</span>
                    <p>{analysis?.summary}</p>
                  </div>
                  <form className="mentor-review-form" onSubmit={(event) => void submitReview(event)}>
                    <label>
                      <span>Decision</span>
                      <select onChange={(event) => setDecision(event.target.value as ReviewDecision)} value={decision}>
                        {reviewDecisions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Comment</span>
                      <textarea
                        onChange={(event) => setComment(event.target.value)}
                        placeholder="Approval notes, rejection reason, or requested developer changes."
                        required
                        rows={6}
                        value={comment}
                      />
                    </label>
                    <button className="primary-action" disabled={isReviewing} type="submit">
                      {isReviewing ? <LoadingSpinner /> : null}
                      {isReviewing ? "Submitting" : "Submit decision"}
                    </button>
                  </form>
                </aside>
              </div>
            </>
          ) : (
            <>
              <div className="panel-heading">
                <p className="eyebrow">Mentor review</p>
                <h2>No item selected</h2>
              </div>
              {message ? <p className="repo-status-message">{message}</p> : null}
            </>
          )}
        </section>
      </div>
    </section>
  );
}

