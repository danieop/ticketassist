"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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

type AgentStepType = (typeof agentSteps)[number]["type"];

const ticketSources: TicketSource[] = ["MANUAL", "EMAIL", "SLACK", "ZENDESK", "JIRA"];

const liveAgentMilestones = [
  { percent: 12, message: "Preparing input snapshot for this agent." },
  { percent: 28, message: "Building prompt and execution context." },
  { percent: 46, message: "Calling the model or repository tool." },
  { percent: 64, message: "Validating structured output." },
  { percent: 82, message: "Preparing handoff payload for the next agent." },
  { percent: 94, message: "Persisting trace and agent result." }
] as const;

const emptyTicket = {
  title: "",
  description: "",
  reporterName: "",
  source: "MANUAL" as TicketSource
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request failed";
}

function stringifySnapshot(value: unknown, maxLength = 6000) {
  if (value === null || value === undefined) {
    return "Not available";
  }

  const truncate = (text: string) =>
    text.length > maxLength ? `${text.slice(0, maxLength)}\n\n...truncated for UI preview` : text;

  if (typeof value === "string") {
    return truncate(value);
  }

  try {
    return truncate(JSON.stringify(value, null, 2));
  } catch {
    return truncate(String(value));
  }
}

function highlightCodeLine(line: string) {
  const tokens = line.match(/("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*")|\b(true|false)\b|\bnull\b|-?\b\d+(?:\.\d+)?\b|[{}[\],:]/g);
  const parts: ReactNode[] = [];
  let cursor = 0;

  for (const token of tokens ?? []) {
    const index = line.indexOf(token, cursor);

    if (index > cursor) {
      parts.push(line.slice(cursor, index));
    }

    const tokenClass = token.endsWith(":")
      ? "json-token-key"
      : /^"/.test(token)
        ? "json-token-string"
        : token === "true" || token === "false"
          ? "json-token-boolean"
          : token === "null"
            ? "json-token-null"
            : /^-?\d/.test(token)
              ? "json-token-number"
              : "json-token-punctuation";

    parts.push(
      <span className={tokenClass} key={`${token}-${index}-${cursor}`}>
        {token}
      </span>
    );
    cursor = index + token.length;
  }

  if (cursor < line.length) {
    parts.push(line.slice(cursor));
  }

  return parts.length > 0 ? parts : " ";
}

function AgentCodeBlock({ title, value }: { title: string; value: unknown }) {
  const code = stringifySnapshot(value);
  const lines = code.split("\n");

  return (
    <div className="agent-code-block">
      <div className="agent-code-toolbar">
        <span>{title}</span>
        <small>JSON</small>
      </div>
      <pre>
        {lines.map((line, index) => (
          <code className="agent-code-line" key={`${title}-${index}`}>
            <span className="agent-code-line-number">{index + 1}</span>
            <span className="agent-code-line-content">{highlightCodeLine(line)}</span>
          </code>
        ))}
      </pre>
    </div>
  );
}

function getAgentStatus(workflow: WorkflowApi | null, type: string, isRunning: boolean, activeAgentType?: string | null) {
  const agentRun = workflow?.agents.find((agent) => agent.agent.type === type);

  if (agentRun) {
    return agentRun.status;
  }

  if (!isRunning || activeAgentType !== type) {
    return "pending";
  }

  return "running";
}

function getTraceForAgent(workflow: WorkflowApi | null, type: string) {
  const run = workflow?.agents.find((agent) => agent.agent.type === type);

  if (!run) {
    return [];
  }

  return workflow?.trace.filter((entry) => entry.agentRunId === run.id) ?? [];
}

function getAgentRun(workflow: WorkflowApi | null, type: string) {
  return workflow?.agents.find((agent) => agent.agent.type === type) ?? null;
}

function getLatestCompletedAgentType(workflow: WorkflowApi | null) {
  return [...(workflow?.agents ?? [])].sort((left, right) => right.agent.executionOrder - left.agent.executionOrder)[0]?.agent.type;
}

function buildLiveInputSnapshot(type: AgentStepType, workflow: WorkflowApi | null, form: typeof emptyTicket) {
  const ticket = workflow?.ticket
    ? {
        title: workflow.ticket.title,
        description: workflow.ticket.description,
        reporterName: workflow.ticket.reporterName,
        source: workflow.ticket.source
      }
    : {
        title: form.title.trim(),
        description: form.description.trim(),
        reporterName: form.reporterName.trim() || "Unknown reporter",
        source: form.source
      };

  if (type === "TICKET_ANALYZER") {
    return { ticket };
  }

  if (type === "PRIORITY_CLASSIFIER") {
    return { ticket, analysis: workflow?.state?.ticketAnalysis };
  }

  if (type === "REPO_SEARCH") {
    return {
      ticket,
      analysis: workflow?.state?.ticketAnalysis,
      priority: workflow?.state?.priorityClassification,
      repository: {
        strategy: "hybrid",
        maxResults: 10
      }
    };
  }

  if (type === "CODE_CONTEXT") {
    return {
      ticket,
      priority: workflow?.state?.priorityClassification,
      repoSearch: {
        queryTerms: workflow?.state?.repoSearchResults?.queryTerms,
        semanticQuery: workflow?.state?.repoSearchResults?.semanticQuery,
        resultCount: workflow?.state?.repoSearchResults?.results?.length
      }
    };
  }

  if (type === "FIX_PROPOSAL") {
    return {
      ticket,
      priority: workflow?.state?.priorityClassification,
      codeContext: workflow?.state?.codeContext
    };
  }

  return {
    ticket,
    codeContext: workflow?.state?.codeContext,
    fixProposal: workflow?.state?.fixProposal
  };
}

function buildLivePromptPreview(type: AgentStepType, workflow: WorkflowApi | null, form: typeof emptyTicket) {
  const input = buildLiveInputSnapshot(type, workflow, form);

  if (type === "TICKET_ANALYZER") {
    return stringifySnapshot({
      system: "Analyze only the bug ticket. Return structured summary, key facts, affected feature, suspected flow, and missing information.",
      user: input
    });
  }

  if (type === "PRIORITY_CLASSIFIER") {
    return stringifySnapshot({
      system: "Classify ticket priority from ticket and previous analysis. Return level, reason, confidence, severity, and business impact.",
      user: input
    });
  }

  if (type === "REPO_SEARCH") {
    return stringifySnapshot({
      system: "Generate focused repository query terms and run repository search.",
      user: input
    });
  }

  if (type === "CODE_CONTEXT") {
    return stringifySnapshot({
      system: "Select the most relevant repository search results for review. Do not propose a fix yet.",
      user: input
    });
  }

  if (type === "FIX_PROPOSAL") {
    return stringifySnapshot({
      system: "Propose a constrained implementation approach. Do not claim code was changed.",
      user: input
    });
  }

  return stringifySnapshot({
    system: "Draft a mentor-review note from workflow outputs. Do not claim the code is fixed.",
    user: input
  });
}

export function DeveloperWorkflowConsole() {
  const [form, setForm] = useState(emptyTicket);
  const [workflow, setWorkflow] = useState<WorkflowApi | null>(null);
  const [recentWorkflows, setRecentWorkflows] = useState<WorkflowApi[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [activeAgentType, setActiveAgentType] = useState<AgentStepType | null>(null);
  const [activeAgentProgress, setActiveAgentProgress] = useState(0);
  const [liveAgentLog, setLiveAgentLog] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const analysis = workflow?.state?.ticketAnalysis;
  const priority = workflow?.state?.priorityClassification;
  const repoSearch = workflow?.state?.repoSearchResults;
  const codeContext = workflow?.state?.codeContext;
  const fixProposal = workflow?.state?.fixProposal;
  const mentorDraft = workflow?.state?.mentorDraft;

  const completedAgentCount = useMemo(
    () =>
      workflow?.progress?.completedAgentCount ??
      agentSteps.filter((step) => getAgentStatus(workflow, step.type, isRunning, activeAgentType) === "success").length,
    [workflow, isRunning, activeAgentType]
  );
  const activeAgent = activeAgentType
    ? agentSteps.find((step) => step.type === activeAgentType)
    : workflow
      ? agentSteps.find((step) => step.type === getLatestCompletedAgentType(workflow))
      : null;
  const latestCompletedAgentType = workflow ? getLatestCompletedAgentType(workflow) : null;
  const activeAgentPercent = isRunning ? activeAgentProgress : activeAgent && workflow ? 100 : 0;
  const canAccept = Boolean(workflow?.requiresDeveloperDecision && workflow.nextAgent && !isRunning);
  const canRerun = Boolean(workflow?.requiresDeveloperDecision && !isRunning);

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
    if (!isRunning || !activeAgentType) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveAgentProgress((current) => {
        const next = Math.min(95, current + (current < 45 ? 7 : current < 80 ? 4 : 2));

        setLiveAgentLog((currentLog) => {
          const nextMessages = liveAgentMilestones
            .filter((milestone) => current < milestone.percent && next >= milestone.percent)
            .map((milestone) => milestone.message);

          if (nextMessages.length === 0) {
            return currentLog;
          }

          return [...currentLog, ...nextMessages];
        });

        return next;
      });
    }, 700);

    return () => window.clearInterval(timer);
  }, [isRunning, activeAgentType]);

  const startLiveAgent = (type: AgentStepType | null, initialMessage: string) => {
    setIsRunning(true);
    setActiveAgentType(type);
    setActiveAgentProgress(type ? 6 : 0);
    setLiveAgentLog(type ? ["Agent started. Preparing execution trace."] : []);
    setMessage(initialMessage);
  };

  const finishLiveAgent = () => {
    setIsRunning(false);
    setActiveAgentType(null);
    setActiveAgentProgress(0);
    setLiveAgentLog([]);
  };

  const updateField = (field: keyof typeof emptyTicket, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const runWorkflow = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWorkflow(null);
    startLiveAgent("TICKET_ANALYZER", "Running Ticket Analyzer.");

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
      setMessage("Ticket Analyzer finished. Accept to continue or rerun this agent.");
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      finishLiveAgent();
    }
  };

  const runWorkflowAction = async (action: "accept" | "rerun") => {
    if (!workflow) {
      return;
    }

    const actionAgentType =
      action === "accept"
        ? workflow.nextAgent?.type
        : [...workflow.agents].sort((left, right) => right.agent.executionOrder - left.agent.executionOrder)[0]?.agent.type;
    const normalizedAgentType = agentSteps.find((step) => step.type === actionAgentType)?.type ?? null;

    startLiveAgent(
      normalizedAgentType,
      action === "accept" ? `Running ${workflow.nextAgent?.name ?? "next agent"}.` : "Rerunning selected agent."
    );

    try {
      const response = await fetch(`${apiBaseUrl}/api/workflows/${workflow.id}/${action}`, {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response));
      }

      const updatedWorkflow = (await response.json()) as WorkflowApi;
      setWorkflow(updatedWorkflow);
      setRecentWorkflows((current) =>
        [updatedWorkflow, ...current.filter((item) => item.id !== updatedWorkflow.id)].slice(0, 12)
      );
      setMessage(
        updatedWorkflow.nextAgent
          ? "Agent finished. Review the handoff, then accept to continue or rerun."
          : "All agents finished. Confirm the mentor draft before sending."
      );
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      finishLiveAgent();
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
        <section className="panel agent-progress-panel agent-progress-panel-primary">
          <div className="panel-heading row-heading">
            <div>
              <p className="eyebrow">Agent progress</p>
              <h2>{activeAgent ? `${activeAgent.label}: ${activeAgentPercent}%` : "No agent running"}</h2>
            </div>
            {workflow ? <StatusBadge status={workflow.status} /> : null}
          </div>

          <div className="agent-overview-strip">
            <div>
              <span>Current agent</span>
              <strong>{activeAgent?.label ?? "Ready"}</strong>
            </div>
            <div>
              <span>Completed</span>
              <strong>{completedAgentCount}/6</strong>
            </div>
            <div>
              <span>Next handoff</span>
              <strong>{workflow?.nextAgent?.name ?? "None"}</strong>
            </div>
          </div>

          <div className="agent-progress-meter" aria-label={`${activeAgentPercent}% complete for current agent`}>
            <span style={{ width: `${activeAgentPercent}%` }} />
          </div>
          <div className="agent-decision-bar">
            <div>
              <strong>{completedAgentCount}/6 agents complete</strong>
              <p>
                {workflow?.nextAgent
                  ? `Next handoff target: ${workflow.nextAgent.name}`
                  : workflow
                    ? "No pending agent handoff."
                    : "Create a workflow to start the first agent."}
              </p>
            </div>
          </div>
          <div className="agent-step-list">
            {agentSteps.map((step, index) => {
              const status = getAgentStatus(workflow, step.type, isRunning, activeAgentType);
              const agentRun = getAgentRun(workflow, step.type);
              const traces = getTraceForAgent(workflow, step.type);
              const startedTrace = traces.find((entry) => entry.metadata?.status === "started");
              const completedTrace = [...traces].reverse().find((entry) => entry.metadata?.status === "completed" || entry.metadata?.status === "failed");
              const isActiveAgent = isRunning && activeAgentType === step.type;
              const isLatestCompletedAgent = latestCompletedAgentType === step.type;
              const isWaitingForDeveloperDecision = Boolean(workflow?.requiresDeveloperDecision && isLatestCompletedAgent && !isRunning);
              const agentProgress = status === "success" || status === "failed" ? 100 : isActiveAgent ? activeAgentProgress : 0;
              const logicSteps = traces.length > 0 ? traces.map((entry) => entry.message) : liveAgentLog;
              const inputSnapshot =
                startedTrace?.metadata?.inputPayload ??
                agentRun?.inputSnapshot ??
                (isActiveAgent ? buildLiveInputSnapshot(step.type, workflow, form) : undefined);
              const promptPreview =
                startedTrace?.metadata?.promptPreview ??
                (isActiveAgent ? buildLivePromptPreview(step.type, workflow, form) : undefined);
              const handoffPayload =
                isActiveAgent || isWaitingForDeveloperDecision
                  ? "Not sent yet. This output will only be packaged for the next agent after Accept and run next."
                  : completedTrace?.metadata?.handoffPayload ?? agentRun?.outputSnapshot;
              const canShowDetails = traces.length > 0 || isActiveAgent;

              return (
                <article
                  className={`agent-step-card agent-step-${status} ${isActiveAgent ? "agent-step-card-active" : ""} ${
                    isWaitingForDeveloperDecision ? "agent-step-card-review" : ""
                  }`}
                  key={step.type}
                >
                  <span>{index + 1}</span>
                  <div>
                    <div className="agent-card-title-row">
                      <strong>{step.label}</strong>
                      <small>{agentProgress}%</small>
                    </div>
                    <p>
                      {completedTrace?.metadata?.outputSummary ??
                        startedTrace?.metadata?.inputSummary ??
                        (isActiveAgent ? liveAgentLog[liveAgentLog.length - 1] : "Waiting for previous step.")}
                    </p>
                    <div className="agent-card-progress" aria-label={`${agentProgress}% complete for ${step.label}`}>
                      <span style={{ width: `${agentProgress}%` }} />
                    </div>
                    {canShowDetails ? (
                      <details className="agent-step-details" open={isActiveAgent ? true : undefined}>
                        <summary>Logic, prompt, and handoff</summary>
                        <div className="agent-detail-grid">
                          <div>
                            <h3>{isActiveAgent ? "Live execution trace" : "Logic steps"}</h3>
                            <ol>
                              {logicSteps.map((entry, logicIndex) => (
                                <li key={`${entry}-${logicIndex}`}>{entry}</li>
                              ))}
                            </ol>
                          </div>
                          <div>
                            <h3>Input to this agent</h3>
                            <AgentCodeBlock title="agent-input.json" value={inputSnapshot} />
                          </div>
                          <div>
                            <h3>Prompt shown to model/tool</h3>
                            <AgentCodeBlock title="prompt-preview.json" value={promptPreview} />
                          </div>
                          <div>
                            <h3>{isActiveAgent || isWaitingForDeveloperDecision ? "Handoff status" : "Handoff to next agent"}</h3>
                            <pre>{stringifySnapshot(handoffPayload)}</pre>
                          </div>
                        </div>
                      </details>
                    ) : null}
                    {isLatestCompletedAgent && workflow?.requiresDeveloperDecision ? (
                      <div className="agent-card-actions">
                        <button
                          className="secondary-action compact-action"
                          disabled={!canRerun}
                          onClick={() => void runWorkflowAction("rerun")}
                          type="button"
                        >
                          Rerun agent
                        </button>
                        <button
                          className="primary-action compact-action"
                          disabled={!canAccept}
                          onClick={() => void runWorkflowAction("accept")}
                          type="button"
                        >
                          Accept and run next
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <StatusBadge status={status} />
                </article>
              );
            })}
          </div>
          {message ? <p className="repo-status-message">{message}</p> : null}
        </section>

        <section className="panel workflow-form-panel workflow-form-panel-compact">
          <div className="panel-heading">
            <p className="eyebrow">New workflow</p>
            <h2>Ticket input</h2>
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
                rows={6}
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
