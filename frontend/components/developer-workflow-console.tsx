"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "./loading-spinner";
import { StatusBadge } from "./status-badge";
import {
  apiBaseUrl,
  formatDateTime,
  getResponseErrorMessage,
  type TicketSource,
  type WorkflowApi,
  type WorkflowDashboardApi,
  type WorkflowSummaryApi,
  type WorkflowSummaryPageApi
} from "@/lib/workflow-api";
import { authFetch } from "@/lib/auth-client";

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
const recentWorkflowPageSize = 10;
const inFlightGetRequests = new Map<string, Promise<unknown>>();

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

function getJsonOnce<T>(requestKey: string, url: string) {
  const existingRequest = inFlightGetRequests.get(requestKey);

  if (existingRequest) {
    return existingRequest as Promise<T>;
  }

  const request = authFetch(url)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response));
      }

      return (await response.json()) as T;
    })
    .finally(() => {
      window.setTimeout(() => {
        inFlightGetRequests.delete(requestKey);
      }, 100);
    });

  inFlightGetRequests.set(requestKey, request);
  return request;
}

function stringifySnapshot(value: unknown, maxLength = 10000) {
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

function AgentCodeBlock({
  title,
  value,
  isEditing,
  editValue,
  editNote,
  onEditValueChange,
  onEditNoteChange,
  onCancelEdit,
  onSaveEdit,
  isSaving
}: {
  title: string;
  value: unknown;
  isEditing?: boolean;
  editValue?: string;
  editNote?: string;
  onEditValueChange?: (value: string) => void;
  onEditNoteChange?: (value: string) => void;
  onCancelEdit?: () => void;
  onSaveEdit?: () => void;
  isSaving?: boolean;
}) {
  const code = stringifySnapshot(value, Number.POSITIVE_INFINITY);
  const lines = code.split("\n");

  return (
    <div className="agent-code-block">
      <div className="agent-code-toolbar">
        <span>{title}</span>
        <small>JSON</small>
      </div>
      {isEditing ? (
        <div className="agent-inline-json-editor">
          <textarea
            onChange={(event) => onEditValueChange?.(event.target.value)}
            spellCheck={false}
            value={editValue ?? ""}
          />
          <input
            onChange={(event) => onEditNoteChange?.(event.target.value)}
            placeholder="Change note"
            type="text"
            value={editNote ?? ""}
          />
          <div className="agent-inline-json-actions">
            <button className="secondary-action compact-action" disabled={isSaving} onClick={onCancelEdit} type="button">
              Cancel
            </button>
            <button className="primary-action compact-action" disabled={isSaving} onClick={onSaveEdit} type="button">
              {isSaving ? <LoadingSpinner /> : null}
              {isSaving ? "Saving" : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <pre>
          {lines.map((line, index) => (
            <code className="agent-code-line" key={`${title}-${index}`}>
              <span className="agent-code-line-number">{index + 1}</span>
              <span className="agent-code-line-content">{highlightCodeLine(line)}</span>
            </code>
          ))}
        </pre>
      )}
    </div>
  );
}

function getAgentStatus(workflow: WorkflowApi | null, type: string, isRunning: boolean, activeAgentType?: string | null) {
  if (isRunning && activeAgentType === type) {
    return "running";
  }

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

function getAgentOutput(workflow: WorkflowApi | null, type: AgentStepType) {
  if (type === "TICKET_ANALYZER") {
    return workflow?.state?.ticketAnalysis;
  }

  if (type === "PRIORITY_CLASSIFIER") {
    return workflow?.state?.priorityClassification;
  }

  if (type === "REPO_SEARCH") {
    return workflow?.state?.repoSearchResults;
  }

  if (type === "CODE_CONTEXT") {
    return workflow?.state?.codeContext;
  }

  if (type === "FIX_PROPOSAL") {
    return workflow?.state?.fixProposal;
  }

  return workflow?.state?.mentorDraft;
}

function isParallelAgentStep(type: AgentStepType) {
  return type === "PRIORITY_CLASSIFIER" || type === "REPO_SEARCH";
}

function getStepNumber(type: AgentStepType, index: number) {
  if (type === "PRIORITY_CLASSIFIER") {
    return "2A";
  }

  if (type === "REPO_SEARCH") {
    return "2B";
  }

  if (index > 2) {
    return String(index);
  }

  return String(index + 1);
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
      system: "Generate focused repository query terms and run repository search from ticket analysis and optional priority.",
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

type WorkflowQueueState = {
  state: "queued" | "running" | "completed" | "failed" | "idle";
  label?: string;
};

function getQueueHistoryMatch(items: unknown[] | undefined, workflowRunId: string) {
  return (items ?? []).find((item): item is { workflowRunId?: string; label?: string } => {
    return Boolean(item && typeof item === "object" && "workflowRunId" in item && item.workflowRunId === workflowRunId);
  });
}

function getWorkflowQueueState(dashboard: WorkflowDashboardApi | null, workflowRunId: string): WorkflowQueueState {
  if (!dashboard) {
    return { state: "idle" };
  }

  if (dashboard.queue.active?.workflowRunId === workflowRunId) {
    return {
      state: "running",
      label: dashboard.queue.active.label
    };
  }

  const pendingJob = dashboard.queue.pendingJobs?.find((job) => job.workflowRunId === workflowRunId);

  if (pendingJob) {
    return {
      state: "queued",
      label: pendingJob.label
    };
  }

  const failedJob = getQueueHistoryMatch(dashboard.queue.failed, workflowRunId);

  if (failedJob) {
    return {
      state: "failed",
      label: failedJob.label
    };
  }

  const completedJob = getQueueHistoryMatch(dashboard.queue.completed, workflowRunId);

  if (completedJob) {
    return {
      state: "completed",
      label: completedJob.label
    };
  }

  return { state: "idle" };
}

function RecentWorkflowRow({
  workflow,
  selected,
  queueState,
  onSelect
}: {
  workflow: WorkflowSummaryApi;
  selected: boolean;
  queueState: WorkflowQueueState;
  onSelect: () => void;
}) {
  const hasQueueState = queueState.state !== "idle";

  return (
    <button
      className={`workflow-row ${selected ? "workflow-row-active" : ""} ${
        queueState.state === "running" || queueState.state === "queued" ? "workflow-row-queued" : ""
      }`}
      onClick={onSelect}
      type="button"
    >
      <span>{workflow.ticket.title}</span>
      <span>{workflow.ticket.reporterName}</span>
      <StatusBadge status={workflow.status} />
      <span className={`workflow-queue-chip workflow-queue-chip-${queueState.state}`}>
        {hasQueueState ? queueState.state : "ready"}
      </span>
      <span>{hasQueueState ? queueState.label ?? "Background job" : formatDateTime(workflow.startedAt)}</span>
    </button>
  );
}

function RecentWorkflowSkeletonRows() {
  return (
    <>
      {Array.from({ length: recentWorkflowPageSize }).map((_, index) => (
        <div className="workflow-row workflow-row-skeleton" key={`workflow-skeleton-${index}`}>
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      ))}
    </>
  );
}

function WorkflowDetailSkeleton() {
  return (
    <div className="workflow-detail-skeleton">
      <section className="panel agent-progress-panel agent-progress-panel-primary">
        <div className="workflow-skeleton-heading">
          <span />
          <span />
        </div>
        <div className="agent-overview-strip workflow-skeleton-grid">
          <div />
          <div />
          <div />
        </div>
        <div className="agent-step-list">
          {Array.from({ length: 6 }).map((_, index) => (
            <article className="agent-step-card workflow-agent-skeleton" key={`agent-detail-skeleton-${index}`}>
              <span />
              <div>
                <strong />
                <p />
                <div />
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="workflow-results-grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <article className="panel workflow-result-skeleton" key={`result-skeleton-${index}`}>
            <span />
            <strong />
            <p />
            <p />
          </article>
        ))}
      </section>
    </div>
  );
}

export function DeveloperWorkflowConsole() {
  return <DeveloperWorkflowWorkspace />;
}

export function WorkflowDetailConsole({ workflowId }: { workflowId: string }) {
  return <DeveloperWorkflowWorkspace workflowId={workflowId} />;
}

function DeveloperWorkflowWorkspace({ workflowId }: { workflowId?: string }) {
  const router = useRouter();
  const isDetailPage = Boolean(workflowId);
  const [form, setForm] = useState(emptyTicket);
  const [workflow, setWorkflow] = useState<WorkflowApi | null>(null);
  const [dashboard, setDashboard] = useState<WorkflowDashboardApi | null>(null);
  const [recentWorkflows, setRecentWorkflows] = useState<WorkflowSummaryApi[]>([]);
  const [recentSearch, setRecentSearch] = useState("");
  const [recentPageMeta, setRecentPageMeta] = useState({
    page: 1,
    limit: recentWorkflowPageSize,
    total: 0,
    totalPages: 1
  });
  const [isRunning, setIsRunning] = useState(false);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [isLoadingWorkflowDetail, setIsLoadingWorkflowDetail] = useState(false);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [isSavingOutput, setIsSavingOutput] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [activeAgentType, setActiveAgentType] = useState<AgentStepType | null>(null);
  const [activeAgentProgress, setActiveAgentProgress] = useState(0);
  const [liveAgentLog, setLiveAgentLog] = useState<string[]>([]);
  const [editingAgentType, setEditingAgentType] = useState<AgentStepType | null>(null);
  const [editingOutput, setEditingOutput] = useState("");
  const [editingNote, setEditingNote] = useState("");
  const [message, setMessage] = useState("");
  const initialOverviewLoadRef = useRef(false);
  const initialWorkflowDetailLoadRef = useRef<string | null>(null);
  const recentRequestKeyRef = useRef<string | null>(null);
  const dashboardRequestRef = useRef(false);
  const workflowDetailRequestRef = useRef<string | null>(null);

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
  const isParallelBatchRunning = Boolean(
    isRunning && workflow?.status === "ticket_analyzed" && activeAgentType === "PRIORITY_CLASSIFIER"
  );
  const activeAgentLabel = isParallelBatchRunning
    ? "Priority Classifier + Repo Search"
    : activeAgent?.label;
  const activeAgentPercent = isRunning ? activeAgentProgress : activeAgent && workflow ? 100 : 0;
  const selectedQueueState = workflow ? getWorkflowQueueState(dashboard, workflow.id) : null;
  const isSelectedWorkflowQueued = selectedQueueState?.state === "queued" || selectedQueueState?.state === "running";
  const canAccept = Boolean(workflow?.requiresDeveloperDecision && workflow.nextAgent && !isSelectedWorkflowQueued && !isRunning);
  const canRerun = Boolean(workflow?.requiresDeveloperDecision && !isSelectedWorkflowQueued && !isRunning);

  const loadRecentWorkflows = async (page = recentPageMeta.page, search = recentSearch) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(recentWorkflowPageSize)
    });
    const trimmedSearch = search.trim();

    if (trimmedSearch) {
      params.set("search", trimmedSearch);
    }

    const requestKey = params.toString();

    if (recentRequestKeyRef.current === requestKey) {
      return;
    }

    recentRequestKeyRef.current = requestKey;
    setIsLoadingRecent(true);

    try {
      const url = `${apiBaseUrl}/api/workflows/summaries?${params.toString()}`;
      const payload = await getJsonOnce<WorkflowSummaryPageApi>(`recent:${requestKey}`, url);
      setRecentWorkflows(payload.items);
      setRecentPageMeta({
        page: payload.page,
        limit: payload.limit,
        total: payload.total,
        totalPages: payload.totalPages
      });
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      recentRequestKeyRef.current = null;
      setIsLoadingRecent(false);
    }
  };

  const searchRecentWorkflows = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loadRecentWorkflows(1, recentSearch);
  };

  const loadWorkflowDetail = async (id: string) => {
    if (workflowDetailRequestRef.current === id) {
      return;
    }

    workflowDetailRequestRef.current = id;
    setIsLoadingWorkflowDetail(true);

    try {
      const payload = await getJsonOnce<WorkflowApi>(`workflow:${id}`, `${apiBaseUrl}/api/workflows/${id}`);
      setWorkflow(payload);
      window.dispatchEvent(
        new CustomEvent("ticketassist:dashboard-header", {
          detail: {
            title: payload.ticket.title,
            description: `${payload.ticket.reporterName} - ${payload.ticket.source} - ${formatDateTime(payload.startedAt)}`
          }
        })
      );
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      workflowDetailRequestRef.current = null;
      setIsLoadingWorkflowDetail(false);
    }
  };

  const loadDashboard = async () => {
    if (dashboardRequestRef.current) {
      return;
    }

    dashboardRequestRef.current = true;
    setIsLoadingDashboard(true);

    try {
      setDashboard(await getJsonOnce<WorkflowDashboardApi>("workflow-dashboard", `${apiBaseUrl}/api/workflows/dashboard`));
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      dashboardRequestRef.current = false;
      setIsLoadingDashboard(false);
    }
  };

  useEffect(() => {
    if (!isDetailPage && !initialOverviewLoadRef.current) {
      initialOverviewLoadRef.current = true;
      window.dispatchEvent(new CustomEvent("ticketassist:dashboard-header", { detail: {} }));
      void loadRecentWorkflows();
      void loadDashboard();
    }

    if (isDetailPage && workflowId && initialWorkflowDetailLoadRef.current !== workflowId) {
      initialWorkflowDetailLoadRef.current = workflowId;
      void loadDashboard();
    }
  }, [isDetailPage]);

  useEffect(() => {
    if (!workflowId) {
      return;
    }

    if (initialWorkflowDetailLoadRef.current === `detail:${workflowId}`) {
      return;
    }

    initialWorkflowDetailLoadRef.current = `detail:${workflowId}`;
    setWorkflow(null);
    window.dispatchEvent(
      new CustomEvent("ticketassist:dashboard-header", {
        detail: {
          description: "Loading workflow detail, agent trace, and review state.",
          loading: true
        }
      })
    );
    void loadWorkflowDetail(workflowId);
  }, [workflowId]);

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

  const startEditingAgent = (type: AgentStepType) => {
    setEditingAgentType(type);
    setEditingOutput(stringifySnapshot(getAgentOutput(workflow, type), Number.POSITIVE_INFINITY));
    setEditingNote("");
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
      const response = await authFetch(`${apiBaseUrl}/api/workflows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          retrievalStrategy: "hybrid",
          forceReindex: false,
          maxResults: 10,
          runAsync: true,
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
      setRecentWorkflows((current) =>
        [createdWorkflow, ...current.filter((item) => item.id !== createdWorkflow.id)].slice(0, recentWorkflowPageSize)
      );
      setMessage("Workflow queued. You can open another workflow while the agent runs in the background.");
      await Promise.all([loadDashboard(), loadRecentWorkflows(1, recentSearch)]);
      router.push(`/developer/workflow/${createdWorkflow.id}`);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      finishLiveAgent();
    }
  };

  const runWorkflowAction = async (action: "accept" | "rerun", agentType?: AgentStepType) => {
    if (!workflow) {
      return;
    }

    const actionAgentType =
      action === "accept"
        ? workflow.nextAgent?.type
        : agentType ?? [...workflow.agents].sort((left, right) => right.agent.executionOrder - left.agent.executionOrder)[0]?.agent.type;
    const normalizedAgentType = agentSteps.find((step) => step.type === actionAgentType)?.type ?? null;
    const isParallelPrioritySearch = action === "accept" && workflow.status === "ticket_analyzed";

    startLiveAgent(
      normalizedAgentType,
      isParallelPrioritySearch
        ? "Running Priority Classifier and Repo Search in parallel."
        : action === "accept"
          ? `Running ${workflow.nextAgent?.name ?? "next agent"}.`
          : "Rerunning selected agent."
    );

    try {
      const response = await authFetch(`${apiBaseUrl}/api/workflows/${workflow.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: action === "accept" || action === "rerun" ? JSON.stringify({ agentType, runAsync: true }) : undefined
      });

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response));
      }

      const updatedWorkflow = (await response.json()) as WorkflowApi;
      setWorkflow(updatedWorkflow);
      setMessage(
        "Agent job queued. You can inspect another workflow while this one continues in the background."
      );
      await Promise.all([loadDashboard(), loadWorkflowDetail(updatedWorkflow.id)]);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      finishLiveAgent();
    }
  };

  const saveAgentOutput = async () => {
    if (!workflow || !editingAgentType) {
      return;
    }

    setIsSavingOutput(true);

    try {
      const parsedOutput = JSON.parse(editingOutput) as unknown;
      const response = await authFetch(`${apiBaseUrl}/api/workflows/${workflow.id}/output`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentType: editingAgentType,
          output: parsedOutput,
          note: editingNote.trim() || undefined
        })
      });

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response));
      }

      const updatedWorkflow = (await response.json()) as WorkflowApi;
      setWorkflow(updatedWorkflow);
      setRecentWorkflows((current) =>
        [updatedWorkflow, ...current.filter((item) => item.id !== updatedWorkflow.id)].slice(0, recentWorkflowPageSize)
      );
      setEditingAgentType(null);
      setEditingOutput("");
      setEditingNote("");
      setMessage("Agent output saved. Review the handoff, then continue.");
      void loadDashboard();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsSavingOutput(false);
    }
  };

  const submitForMentor = async () => {
    if (!workflow) {
      return;
    }

    setIsSubmittingReview(true);

    try {
      const response = await authFetch(`${apiBaseUrl}/api/workflows/${workflow.id}/submit`, {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response));
      }

      const submittedWorkflow = (await response.json()) as WorkflowApi;
      setWorkflow(submittedWorkflow);
      setMessage("Sent to mentor review queue.");
      void loadDashboard();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (!isDetailPage) {
    return (
      <section className="workflow-console workflow-overview-console">
        <section className="panel workflow-dashboard-panel">
          <div className="panel-heading row-heading">
            <div>
              <p className="eyebrow">Workflow dashboard</p>
              <h2>Agent operations</h2>
            </div>
            <button className="secondary-action compact-action" disabled={isLoadingDashboard} onClick={() => void loadDashboard()} type="button">
              {isLoadingDashboard ? <LoadingSpinner /> : null}
              {isLoadingDashboard ? "Refreshing" : "Refresh"}
            </button>
          </div>
          <div className="workflow-dashboard-grid">
            <div>
              <span>Avg latency</span>
              <strong>{dashboard ? `${dashboard.averageAgentLatencyMs}ms` : "..."}</strong>
            </div>
            <div>
              <span>Fallback rate</span>
              <strong>{dashboard ? `${Math.round(dashboard.fallbackRate * 100)}%` : "..."}</strong>
            </div>
            <div>
              <span>Queue</span>
              <strong>
                {dashboard
                  ? dashboard.queue.active
                    ? `${dashboard.queue.pending} pending + 1 running`
                    : `${dashboard.queue.pending} pending`
                  : "..."}
              </strong>
            </div>
            <div>
              <span>Mentor decisions</span>
              <strong>{Object.values(dashboard?.mentorDecisions ?? {}).reduce((sum, value) => sum + value, 0)}</strong>
            </div>
          </div>
        </section>

        <div className="developer-overview-grid">
          <section className="panel recent-workflows-panel">
            <div className="panel-heading row-heading">
              <div>
                <p className="eyebrow">Recent workflows</p>
                <h2>Developer handoffs</h2>
              </div>
              <button className="secondary-action compact-action" disabled={isLoadingRecent} onClick={() => void loadRecentWorkflows()} type="button">
                {isLoadingRecent ? <LoadingSpinner /> : null}
                {isLoadingRecent ? "Refreshing" : "Refresh"}
              </button>
            </div>
            <form className="workflow-recent-tools" onSubmit={searchRecentWorkflows}>
              <label>
                <span>Search title</span>
                <input
                  onChange={(event) => setRecentSearch(event.target.value)}
                  placeholder="Search workflow title"
                  type="search"
                  value={recentSearch}
                />
              </label>
              <button className="secondary-action compact-action" disabled={isLoadingRecent} type="submit">
                Search
              </button>
            </form>
            <div className="workflow-table">
              {isLoadingRecent ? <RecentWorkflowSkeletonRows /> : null}
              {!isLoadingRecent
                ? recentWorkflows.map((item) => (
                    <RecentWorkflowRow
                      key={item.id}
                      onSelect={() => router.push(`/developer/workflow/${item.id}`)}
                      queueState={getWorkflowQueueState(dashboard, item.id)}
                      selected={false}
                      workflow={item}
                    />
                  ))
                : null}
              {!isLoadingRecent && recentWorkflows.length === 0 ? <p className="muted-text">No workflows yet.</p> : null}
            </div>
            <div className="workflow-pagination">
              <span>
                Page {recentPageMeta.page} of {recentPageMeta.totalPages} - {recentPageMeta.total} workflows
              </span>
              <div>
                <button
                  className="secondary-action compact-action"
                  disabled={isLoadingRecent || recentPageMeta.page <= 1}
                  onClick={() => void loadRecentWorkflows(recentPageMeta.page - 1, recentSearch)}
                  type="button"
                >
                  Previous
                </button>
                <button
                  className="secondary-action compact-action"
                  disabled={isLoadingRecent || recentPageMeta.page >= recentPageMeta.totalPages}
                  onClick={() => void loadRecentWorkflows(recentPageMeta.page + 1, recentSearch)}
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
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
              <div className="workflow-queue-note">
                <strong>Background queue always on</strong>
                <span>Each agent job is queued automatically, so you can keep browsing other workflows.</span>
              </div>
              <button className="primary-action" disabled={isRunning} type="submit">
                {isRunning ? <LoadingSpinner /> : null}
                {isRunning ? "Queueing workflow" : "Queue workflow"}
              </button>
            </form>
          </section>
        </div>

        <section className="panel workflow-audit-panel">
          <div className="panel-heading">
            <p className="eyebrow">Audit and versions</p>
            <h2>Developer control history</h2>
          </div>
          <div className="workflow-audit-grid">
            <div>
              <span>Output edits</span>
              <strong>{dashboard?.editCount ?? 0}</strong>
            </div>
            <div>
              <span>Reruns</span>
              <strong>{dashboard?.rerunCount ?? 0}</strong>
            </div>
            <div>
              <span>Fallbacks</span>
              <strong>{dashboard?.fallbackCount ?? 0}</strong>
            </div>
            <div>
              <span>Queue pending</span>
              <strong>{dashboard?.queue.pending ?? 0}</strong>
            </div>
            <div>
              <span>Queue completed</span>
              <strong>{dashboard?.queue.completed.length ?? 0}</strong>
            </div>
            <div>
              <span>Queue failed</span>
              <strong>{dashboard?.queue.failed.length ?? 0}</strong>
            </div>
          </div>
          {message ? <p className="repo-status-message">{message}</p> : null}
        </section>
      </section>
    );
  }

  if (isLoadingWorkflowDetail && !workflow) {
    return (
      <section className="workflow-console workflow-detail-console">
        <div className="workflow-detail-nav">
          <Link className="secondary-action compact-action" href="/developer">
            Back to workflows
          </Link>
          <button className="secondary-action compact-action" disabled type="button">
            <LoadingSpinner />
            Loading workflow
          </button>
        </div>
        <WorkflowDetailSkeleton />
      </section>
    );
  }

  return (
    <section className="workflow-console workflow-detail-console">
      <div className="workflow-detail-nav">
        <Link className="secondary-action compact-action" href="/developer">
          Back to workflows
        </Link>
        <button className="secondary-action compact-action" onClick={() => workflowId ? void loadWorkflowDetail(workflowId) : undefined} type="button">
          Refresh workflow
        </button>
      </div>
      {/* <section className="panel recent-workflows-panel">
        <div className="panel-heading row-heading">
          <div>
            <p className="eyebrow">Recent workflows</p>
            <h2>Developer handoffs</h2>
          </div>
          <button className="secondary-action compact-action" disabled={isLoadingRecent} onClick={() => void loadRecentWorkflows()} type="button">
            {isLoadingRecent ? <LoadingSpinner /> : null}
            {isLoadingRecent ? "Refreshing" : "Refresh"}
          </button>
        </div>
        <div className="workflow-table">
          {isLoadingRecent && recentWorkflows.length === 0
            ? Array.from({ length: 4 }).map((_, index) => (
                <div className="workflow-row workflow-row-skeleton" key={`workflow-skeleton-${index}`}>
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              ))
            : null}
          {recentWorkflows.map((item) => (
            <RecentWorkflowRow
              key={item.id}
              onSelect={() => setWorkflow(item)}
              queueState={getWorkflowQueueState(dashboard, item.id)}
              selected={item.id === workflow?.id}
              workflow={item}
            />
          ))}
          {!isLoadingRecent && recentWorkflows.length === 0 ? <p className="muted-text">No workflows yet.</p> : null}
        </div>
      </section> */}
      {/* <section className="panel workflow-dashboard-panel">
        <div className="panel-heading row-heading">
          <div>
            <p className="eyebrow">Workflow dashboard</p>
            <h2>Agent operations</h2>
          </div>
          <button className="secondary-action compact-action" disabled={isLoadingDashboard} onClick={() => void loadDashboard()} type="button">
            {isLoadingDashboard ? <LoadingSpinner /> : null}
            {isLoadingDashboard ? "Refreshing" : "Refresh"}
          </button>
        </div>
        <div className="workflow-dashboard-grid">
          <div>
            <span>Avg latency</span>
            <strong>{dashboard ? `${dashboard.averageAgentLatencyMs}ms` : "..."}</strong>
          </div>
          <div>
            <span>Fallback rate</span>
            <strong>{dashboard ? `${Math.round(dashboard.fallbackRate * 100)}%` : "..."}</strong>
          </div>
          <div>
            <span>Reruns</span>
            <strong>{dashboard?.rerunCount ?? 0}</strong>
          </div>
          <div>
            <span>Edits</span>
            <strong>{dashboard?.editCount ?? 0}</strong>
          </div>
            <div>
              <span>Queue</span>
              <strong>
                {dashboard
                  ? dashboard.queue.active
                    ? `${dashboard.queue.pending} pending + 1 running`
                    : `${dashboard.queue.pending} pending`
                  : "..."}
              </strong>
            </div>
          <div>
            <span>Mentor decisions</span>
            <strong>{Object.values(dashboard?.mentorDecisions ?? {}).reduce((sum, value) => sum + value, 0)}</strong>
          </div>
        </div>
      </section> */}
      <div className="workflow-console-grid">
        <section className="panel agent-progress-panel agent-progress-panel-primary">
          <div className="panel-heading row-heading">
            <div>
              <p className="eyebrow">Agent progress</p>
              <h2>{activeAgentLabel ? `${activeAgentLabel}: ${activeAgentPercent}%` : "No agent running"}</h2>
            </div>
            {workflow ? <StatusBadge status={workflow.status} /> : null}
          </div>

          <div className="agent-overview-strip">
            <div>
              <span>Current agent</span>
              <strong>{isSelectedWorkflowQueued ? selectedQueueState?.label ?? "Queued job" : activeAgentLabel ?? "Ready"}</strong>
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
                {isSelectedWorkflowQueued
                  ? `${selectedQueueState?.state === "running" ? "Running" : "Queued"} in background: ${selectedQueueState?.label ?? "agent job"}. You can switch workflows safely.`
                  : workflow?.nextAgent
                  ? `Next handoff target: ${workflow.nextAgent.name}`
                  : workflow
                    ? "No pending agent handoff."
                    : "Create a workflow to start the first agent."}
              </p>
            </div>
          </div>
          <div className={`parallel-agent-banner ${isParallelBatchRunning ? "parallel-agent-banner-active" : ""}`}>
            <div>
              <span>Parallel batch</span>
              <strong>2A Priority Classifier + 2B Repo Search</strong>
            </div>
            <p>
              Both agents start from the Ticket Analyzer handoff. Repo Search can run from ticket analysis while Priority
              Classifier independently scores impact.
            </p>
          </div>
          <div className="agent-step-list">
            {agentSteps.map((step, index) => {
              const isParallelStep = isParallelAgentStep(step.type);
              const status = isParallelBatchRunning && isParallelStep
                ? "running"
                : getAgentStatus(workflow, step.type, isRunning, activeAgentType);
              const agentRun = getAgentRun(workflow, step.type);
              const traces = getTraceForAgent(workflow, step.type);
              const startedTrace = traces.find((entry) => entry.metadata?.status === "started");
              const completedTrace = [...traces].reverse().find((entry) => entry.metadata?.status === "completed" || entry.metadata?.status === "failed");
              const isActiveAgent = isParallelBatchRunning && isParallelStep ? true : isRunning && activeAgentType === step.type;
              const isLatestCompletedAgent = latestCompletedAgentType === step.type;
              const isCompletedAgent = status === "success";
              const isStaleAgent = workflow?.workflowMeta?.staleAgentTypes?.includes(step.type);
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
                getAgentOutput(workflow, step.type) ??
                completedTrace?.metadata?.handoffPayload ??
                agentRun?.outputSnapshot ??
                (isActiveAgent ? "Waiting for this agent to finish." : undefined);
              const canShowDetails = traces.length > 0 || isActiveAgent;

              return (
                <article
                  className={`agent-step-card agent-step-${status} ${isParallelStep ? "agent-step-card-parallel" : ""} ${
                    isActiveAgent ? "agent-step-card-active" : ""
                  } ${
                    workflow?.requiresDeveloperDecision && isLatestCompletedAgent && !isRunning ? "agent-step-card-review" : ""
                  }`}
                  key={step.type}
                >
                  <span>{getStepNumber(step.type, index)}</span>
                  <div>
                    <div className="agent-card-title-row">
                      <strong>
                        {step.label}
                        {isParallelStep ? <em>Parallel</em> : null}
                      </strong>
                      <small>{isStaleAgent ? "stale" : `${agentProgress}%`}</small>
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
                            <div className="agent-detail-heading-row">
                              <h3>Handoff status</h3>
                              {workflow?.requiresDeveloperDecision && isCompletedAgent ? (
                                <button
                                  className="secondary-action compact-action"
                                  disabled={isSelectedWorkflowQueued || isRunning || isSavingOutput}
                                  onClick={() => startEditingAgent(step.type)}
                                  type="button"
                                >
                                  Edit
                                </button>
                              ) : null}
                            </div>
                            <AgentCodeBlock
                              editNote={editingNote}
                              editValue={editingOutput}
                              isEditing={editingAgentType === step.type}
                              isSaving={isSavingOutput}
                              onCancelEdit={() => setEditingAgentType(null)}
                              onEditNoteChange={setEditingNote}
                              onEditValueChange={setEditingOutput}
                              onSaveEdit={() => void saveAgentOutput()}
                              title="handoff-status.json"
                              value={handoffPayload}
                            />
                          </div>
                        </div>
                      </details>
                    ) : null}
                    {workflow?.requiresDeveloperDecision && isCompletedAgent ? (
                      <div className="agent-card-actions">
                        <button
                          className="secondary-action compact-action"
                          disabled={!canRerun}
                          onClick={() => void runWorkflowAction("rerun", step.type)}
                          type="button"
                        >
                          {isRunning && activeAgentType === step.type ? <LoadingSpinner /> : null}
                          Rerun agent
                        </button>
                        <button
                          className="primary-action compact-action"
                          disabled={!canAccept || !isLatestCompletedAgent}
                          onClick={() => void runWorkflowAction("accept")}
                          type="button"
                        >
                          {isRunning && activeAgentType === workflow?.nextAgent?.type ? <LoadingSpinner /> : null}
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
            <div className="workflow-dashboard-grid">
              <div>
                <span>Graph nodes</span>
                <strong>{repoSearch?.dependencyGraph?.nodes.length ?? 0}</strong>
              </div>
              <div>
                <span>Graph edges</span>
                <strong>{repoSearch?.dependencyGraph?.edges.length ?? 0}</strong>
              </div>
              <div>
                <span>Memory matches</span>
                <strong>{repoSearch?.memoryMatches?.length ?? 0}</strong>
              </div>
            </div>
            <ul className="file-list">
              {(codeContext?.relevantFiles ?? repoSearch?.results ?? []).slice(0, 6).map((result) => (
                <li key={`${result.filePath}-${result.startLine ?? 0}`}>
                  {result.filePath}
                  {"startLine" in result && result.startLine ? `:${result.startLine}` : ""}
                </li>
              ))}
            </ul>
            {codeContext?.graphContext ? <p className="muted-text">{codeContext.graphContext.summary}</p> : null}
            {codeContext?.memoryContext ? <p className="muted-text">{codeContext.memoryContext.summary}</p> : null}
          </article>

          <article className="panel">
            <div className="panel-heading">
              <p className="eyebrow">Fix proposal</p>
              <h2>{fixProposal?.title}</h2>
            </div>
            <p className="muted-text">{fixProposal?.recommendedApproach}</p>
            <div className="workflow-dashboard-grid">
              <div>
                <span>Patch mode</span>
                <strong>{fixProposal?.patchProposal?.applyMode ?? "none"}</strong>
              </div>
              <div>
                <span>Test framework</span>
                <strong>{fixProposal?.testPlan?.framework ?? "unknown"}</strong>
              </div>
              <div>
                <span>Verification</span>
                <strong>{fixProposal?.verificationReport?.status ?? "not_run"}</strong>
              </div>
            </div>
            <ul className="clean-list">
              {(fixProposal?.verificationSteps ?? []).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
            {fixProposal?.patchProposal?.targetFiles.length ? (
              <p className="muted-text">Patch targets: {fixProposal.patchProposal.targetFiles.slice(0, 3).join(", ")}</p>
            ) : null}
            {fixProposal?.testPlan?.cases.length ? (
              <ul className="clean-list">
                {fixProposal.testPlan.cases.map((testCase) => (
                  <li key={testCase.name}>{testCase.name}</li>
                ))}
              </ul>
            ) : null}
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
                {isSubmittingReview ? <LoadingSpinner /> : null}
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
          <section className="panel workflow-audit-panel">
            <div className="panel-heading">
              <p className="eyebrow">Audit and versions</p>
              <h2>Developer control history</h2>
            </div>
            <div className="workflow-audit-grid">
              <div>
                <span>Output edits</span>
                <strong>{workflow.workflowMeta?.edits?.length ?? 0}</strong>
              </div>
              <div>
                <span>Reruns</span>
                <strong>{workflow.workflowMeta?.reruns?.length ?? 0}</strong>
              </div>
              <div>
                <span>Prompt versions</span>
                <strong>{workflow.workflowMeta?.promptVersions?.length ?? 0}</strong>
              </div>
              <div>
                <span>Output versions</span>
                <strong>{workflow.workflowMeta?.outputVersions?.length ?? 0}</strong>
              </div>
              <div>
                <span>Review requests</span>
                <strong>{workflow.workflowMeta?.reviewRequests?.length ?? 0}</strong>
              </div>
              <div>
                <span>Stale agents</span>
                <strong>{workflow.workflowMeta?.staleAgentTypes?.length ?? 0}</strong>
              </div>
            </div>
          </section>
        </section>
      ) : null}

      
    </section>
  );
}
