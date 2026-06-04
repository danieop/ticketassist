"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "./status-badge";
import {
  apiBaseUrl,
  formatDateTime,
  getResponseErrorMessage,
  type TicketSource,
  type WorkflowApi
} from "@/lib/workflow-api";

const agentSteps = [
  { type: "TICKET_ANALYZER", label: "Ticket Analyzer" },
  { type: "PRIORITY_CLASSIFIER", label: "Priority Classifier" },
  { type: "REPO_SEARCH", label: "Repo Search" },
  { type: "CODE_CONTEXT", label: "Code Context" },
  { type: "FIX_PROPOSAL", label: "Fix Proposal" },
  { type: "MENTOR_DRAFT", label: "Mentor Draft" }
] as const;

const ticketSources: TicketSource[] = ["MANUAL", "EMAIL", "SLACK", "ZENDESK", "JIRA"];

const emptyTicket = {
  title: "",
  description: "",
  reporterName: "",
  source: "MANUAL" as TicketSource
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request failed";
}

function getAgentStatus(workflow: WorkflowApi | null, type: string, isRunning: boolean, simulatedIndex: number) {
  const agentRun = workflow?.agents.find((agent) => agent.agent.type === type);

  if (agentRun) {
    return agentRun.status;
  }

  if (!isRunning) {
    return "pending";
  }

  const index = agentSteps.findIndex((step) => step.type === type);

  if (index < simulatedIndex) {
    return "success";
  }

  if (index === simulatedIndex) {
    return "running";
  }

  return "pending";
}

export function DeveloperWorkflowConsole() {
  const [form, setForm] = useState(emptyTicket);
  const [workflow, setWorkflow] = useState<WorkflowApi | null>(null);
  const [recentWorkflows, setRecentWorkflows] = useState<WorkflowApi[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [simulatedIndex, setSimulatedIndex] = useState(0);
  const [message, setMessage] = useState("");

  const analysis = workflow?.state?.ticketAnalysis;
  const priority = workflow?.state?.priorityClassification;
  const repoSearch = workflow?.state?.repoSearchResults;
  const codeContext = workflow?.state?.codeContext;
  const fixProposal = workflow?.state?.fixProposal;
  const mentorDraft = workflow?.state?.mentorDraft;

  const completedAgentCount = useMemo(
    () => agentSteps.filter((step) => getAgentStatus(workflow, step.type, isRunning, simulatedIndex) === "success").length,
    [workflow, isRunning, simulatedIndex]
  );

  const loadRecentWorkflows = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/workflows?limit=12`);

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response));
      }

      setRecentWorkflows((await response.json()) as WorkflowApi[]);
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  };

  useEffect(() => {
    void loadRecentWorkflows();
  }, []);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const timer = window.setInterval(() => {
      setSimulatedIndex((current) => Math.min(agentSteps.length - 1, current + 1));
    }, 900);

    return () => window.clearInterval(timer);
  }, [isRunning]);

  const updateField = (field: keyof typeof emptyTicket, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const runWorkflow = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsRunning(true);
    setWorkflow(null);
    setSimulatedIndex(0);
    setMessage("Running agent pipeline.");

    try {
      const response = await fetch(`${apiBaseUrl}/api/workflows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          retrievalStrategy: "hybrid",
          forceReindex: false,
          maxResults: 10,
          ticket: {
            title: form.title.trim(),
            description: form.description.trim(),
            reporterName: form.reporterName.trim() || "Unknown reporter",
            source: form.source
          }
        })
      });

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response));
      }

      const createdWorkflow = (await response.json()) as WorkflowApi;
      setWorkflow(createdWorkflow);
      setRecentWorkflows((current) => [createdWorkflow, ...current.filter((item) => item.id !== createdWorkflow.id)].slice(0, 12));
      setMessage("Mentor draft is ready for developer confirmation.");
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsRunning(false);
      setSimulatedIndex(agentSteps.length - 1);
    }
  };

  const submitForMentor = async () => {
    if (!workflow) {
      return;
    }

    setIsSubmittingReview(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/workflows/${workflow.id}/submit`, {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response));
      }

      const submittedWorkflow = (await response.json()) as WorkflowApi;
      setWorkflow(submittedWorkflow);
      setRecentWorkflows((current) =>
        current.map((item) => (item.id === submittedWorkflow.id ? submittedWorkflow : item))
      );
      setMessage("Sent to mentor review queue.");
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <section className="workflow-console">
      <div className="workflow-console-grid">
        <section className="panel workflow-form-panel">
          <div className="panel-heading">
            <p className="eyebrow">New workflow</p>
            <h2>Run agent pipeline</h2>
          </div>
          <form className="workflow-ticket-form" onSubmit={(event) => void runWorkflow(event)}>
            <label>
              <span>Title</span>
              <input
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="Checkout hangs after coupon is applied"
                required
                type="text"
                value={form.title}
              />
            </label>
            <label>
              <span>Description</span>
              <textarea
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="Describe the symptom, impact, environment, and any workaround."
                required
                rows={8}
                value={form.description}
              />
            </label>
            <div className="ticket-form-row">
              <label>
                <span>Reporter</span>
                <input
                  onChange={(event) => updateField("reporterName", event.target.value)}
                  placeholder="Reporter name"
                  type="text"
                  value={form.reporterName}
                />
              </label>
              <label>
                <span>Source</span>
                <select onChange={(event) => updateField("source", event.target.value)} value={form.source}>
                  {ticketSources.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button className="primary-action" disabled={isRunning} type="submit">
              {isRunning ? "Running agents" : "Run workflow"}
            </button>
          </form>
        </section>

        <section className="panel agent-progress-panel">
          <div className="panel-heading row-heading">
            <div>
              <p className="eyebrow">Agent progress</p>
              <h2>{completedAgentCount}/6 steps complete</h2>
            </div>
            {workflow ? <StatusBadge status={workflow.status} /> : null}
          </div>
          <div className="agent-step-list">
            {agentSteps.map((step, index) => {
              const status = getAgentStatus(workflow, step.type, isRunning, simulatedIndex);
              const trace = workflow?.trace.find((entry) => entry.message.includes(step.label.replace(" ", "")) || entry.message.includes(step.label));

              return (
                <article className={`agent-step-card agent-step-${status}`} key={step.type}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{step.label}</strong>
                    <p>{trace?.metadata?.outputSummary ?? trace?.message ?? "Waiting for previous step."}</p>
                  </div>
                  <StatusBadge status={status} />
                </article>
              );
            })}
          </div>
          {message ? <p className="repo-status-message">{message}</p> : null}
        </section>
      </div>

      {workflow ? (
        <section className="workflow-results-grid">
          <article className="panel">
            <div className="panel-heading">
              <p className="eyebrow">Analysis</p>
              <h2>{analysis?.affectedFeature ?? "Ticket signal"}</h2>
            </div>
            <p className="muted-text">{analysis?.summary}</p>
            <ul className="clean-list">
              {(analysis?.keyFacts ?? []).map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          </article>

          <article className="panel priority-panel">
            <div className="panel-heading">
              <p className="eyebrow">Priority</p>
              <h2>{priority?.level ?? "Unknown"}</h2>
            </div>
            <p>{priority?.reason}</p>
            <strong>{priority?.businessImpact}</strong>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <p className="eyebrow">Repository context</p>
              <h2>{repoSearch?.results?.length ?? 0} matches</h2>
            </div>
            <p className="query-line">{repoSearch?.semanticQuery}</p>
            <ul className="file-list">
              {(codeContext?.relevantFiles ?? repoSearch?.results ?? []).slice(0, 6).map((result) => (
                <li key={`${result.filePath}-${result.startLine ?? 0}`}>
                  {result.filePath}
                  {"startLine" in result && result.startLine ? `:${result.startLine}` : ""}
                </li>
              ))}
            </ul>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <p className="eyebrow">Fix proposal</p>
              <h2>{fixProposal?.title}</h2>
            </div>
            <p className="muted-text">{fixProposal?.recommendedApproach}</p>
            <ul className="clean-list">
              {(fixProposal?.verificationSteps ?? []).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </article>

          <section className="panel mentor-submit-panel">
            <div className="panel-heading row-heading">
              <div>
                <p className="eyebrow">Mentor draft</p>
                <h2>Confirm before sending</h2>
              </div>
              <button
                className="primary-action"
                disabled={workflow.status !== "mentor_draft_ready" || isSubmittingReview}
                onClick={() => void submitForMentor()}
                type="button"
              >
                {workflow.status === "waiting_for_review" ? "Sent to mentor" : isSubmittingReview ? "Sending" : "Send to mentor"}
              </button>
            </div>
            <div className="draft-box">
              <p>{mentorDraft?.response}</p>
            </div>
            <ul className="clean-list">
              {(mentorDraft?.checklist ?? []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </section>
      ) : null}

      <section className="panel recent-workflows-panel">
        <div className="panel-heading row-heading">
          <div>
            <p className="eyebrow">Recent workflows</p>
            <h2>Developer handoffs</h2>
          </div>
          <button className="secondary-action compact-action" onClick={() => void loadRecentWorkflows()} type="button">
            Refresh
          </button>
        </div>
        <div className="workflow-table">
          {recentWorkflows.map((item) => (
            <button className="workflow-row" key={item.id} onClick={() => setWorkflow(item)} type="button">
              <span>{item.ticket.title}</span>
              <span>{item.ticket.reporterName}</span>
              <StatusBadge status={item.status} />
              <span>{formatDateTime(item.startedAt)}</span>
            </button>
          ))}
          {recentWorkflows.length === 0 ? <p className="muted-text">No workflows yet.</p> : null}
        </div>
      </section>
    </section>
  );
}

