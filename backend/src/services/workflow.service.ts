import { Prisma, type WorkflowStatus as DbWorkflowStatus, type AgentType } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../middlewares/error-handler.js";
import { repositoryService } from "./repository.service.js";
import { workflowJobQueue } from "./workflow-job-queue.service.js";
import {
  getAgentForCompletedStatus,
  getNextWorkflowAgent,
  type WorkflowAgentType,
  runPriorityAndRepoSearchAgents,
  rerunCompletedWorkflowAgent,
  runNextWorkflowAgent,
  workflowAgentSequence
} from "./workflow.graph.js";
import {
  codeContextSchema,
  fixProposalSchema,
  mentorDraftSchema,
  priorityClassificationSchema,
  repoSearchSchema,
  ticketAnalysisSchema,
  type TicketWorkflowState,
  type WorkflowStatus,
  type WorkflowTraceEntry
} from "./workflow-state.js";
import { nowIso } from "./workflow-state.js";
import type {
  AcceptWorkflowAgentInput,
  CreateWorkflowInput,
  RerunWorkflowAgentInput,
  UpdateWorkflowOutputInput,
  ReviewWorkflowInput
} from "../validators/workflow.validators.js";

const defaultAgents = [
  {
    name: "Ticket Intake Agent",
    type: "TICKET_ANALYZER",
    description: "Normalizes ticket input and extracts symptoms, constraints, and missing information.",
    executionOrder: 1
  },
  {
    name: "Priority Agent",
    type: "PRIORITY_CLASSIFIER",
    description: "Classifies severity and explains product or customer impact.",
    executionOrder: 2
  },
  {
    name: "Repo Search Agent",
    type: "REPO_SEARCH",
    description: "Searches focused repository context without sending the entire repository to the model.",
    executionOrder: 3
  },
  {
    name: "Code Context Agent",
    type: "CODE_CONTEXT",
    description: "Summarizes relevant files and likely touchpoints for review.",
    executionOrder: 4
  },
  {
    name: "Fix Proposal Agent",
    type: "FIX_PROPOSAL",
    description: "Drafts a constrained implementation proposal and risk notes.",
    executionOrder: 5
  },
  {
    name: "Mentor Draft Agent",
    type: "MENTOR_DRAFT",
    description: "Builds the final mentor review draft without claiming the issue is fixed.",
    executionOrder: 6
  }
] as const;

const workflowInclude = {
  ticket: true,
  repository: true,
  state: true,
  agentRuns: {
    include: {
      agent: true,
      traceLogs: true
    },
    orderBy: {
      startedAt: "asc"
    }
  },
  traceLogs: {
    orderBy: {
      createdAt: "asc"
    }
  },
  repoSearchResults: {
    orderBy: {
      relevanceScore: "desc"
    }
  },
  mentorReview: {
    include: {
      mentor: true
    }
  }
} as const;

const workflowSummaryInclude = {
  ticket: true,
  repository: true,
  state: true,
  mentorReview: true
} as const;

const dbStatusByWorkflowStatus: Record<
  WorkflowStatus,
  | "CREATED"
  | "TICKET_ANALYZED"
  | "PRIORITY_CLASSIFIED"
  | "REPO_SEARCHED"
  | "CODE_CONTEXT_READY"
  | "FIX_PROPOSED"
  | "MENTOR_DRAFT_READY"
  | "WAITING_FOR_REVIEW"
  | "FAILED"
> = {
  created: "CREATED",
  ticket_analyzed: "TICKET_ANALYZED",
  priority_classified: "PRIORITY_CLASSIFIED",
  repo_searched: "REPO_SEARCHED",
  code_context_ready: "CODE_CONTEXT_READY",
  fix_proposed: "FIX_PROPOSED",
  mentor_draft_ready: "MENTOR_DRAFT_READY",
  waiting_for_review: "WAITING_FOR_REVIEW",
  failed: "FAILED"
};

const outputFieldByAgentType: Record<
  WorkflowAgentType,
  "analysis" | "priority" | "repoSearch" | "codeContext" | "fixProposal" | "mentorDraft"
> = {
  TICKET_ANALYZER: "analysis",
  PRIORITY_CLASSIFIER: "priority",
  REPO_SEARCH: "repoSearch",
  CODE_CONTEXT: "codeContext",
  FIX_PROPOSAL: "fixProposal",
  MENTOR_DRAFT: "mentorDraft"
};

const stateStatusByAgentType: Record<WorkflowAgentType, WorkflowStatus> = {
  TICKET_ANALYZER: "ticket_analyzed",
  PRIORITY_CLASSIFIER: "priority_classified",
  REPO_SEARCH: "repo_searched",
  CODE_CONTEXT: "code_context_ready",
  FIX_PROPOSAL: "fix_proposed",
  MENTOR_DRAFT: "mentor_draft_ready"
};

const dbStateFieldByAgentType: Record<
  WorkflowAgentType,
  | "ticketAnalysis"
  | "priorityClassification"
  | "repoSearchResults"
  | "codeContext"
  | "fixProposal"
  | "mentorDraft"
> = {
  TICKET_ANALYZER: "ticketAnalysis",
  PRIORITY_CLASSIFIER: "priorityClassification",
  REPO_SEARCH: "repoSearchResults",
  CODE_CONTEXT: "codeContext",
  FIX_PROPOSAL: "fixProposal",
  MENTOR_DRAFT: "mentorDraft"
};

function getAgentSequenceIndex(agentType: WorkflowAgentType) {
  return workflowAgentSequence.findIndex((agent) => agent.type === agentType);
}

function parseAgentOutput(agentType: WorkflowAgentType, output: unknown) {
  if (agentType === "TICKET_ANALYZER") {
    return ticketAnalysisSchema.parse(output);
  }

  if (agentType === "PRIORITY_CLASSIFIER") {
    return priorityClassificationSchema.parse(output);
  }

  if (agentType === "REPO_SEARCH") {
    return repoSearchSchema.parse(output);
  }

  if (agentType === "CODE_CONTEXT") {
    return codeContextSchema.parse(output);
  }

  if (agentType === "FIX_PROPOSAL") {
    return fixProposalSchema.parse(output);
  }

  return mentorDraftSchema.parse(output);
}

function getWorkflowMeta(inputTicket: Prisma.JsonValue | null | undefined) {
  if (!inputTicket || typeof inputTicket !== "object" || Array.isArray(inputTicket)) {
    return {};
  }

  const value = inputTicket as { workflowMeta?: unknown };
  return value.workflowMeta && typeof value.workflowMeta === "object" && !Array.isArray(value.workflowMeta)
    ? (value.workflowMeta as Record<string, unknown>)
    : {};
}

function nextVersion(meta: Record<string, unknown>, key: "promptVersions" | "outputVersions") {
  const values = Array.isArray(meta[key]) ? (meta[key] as unknown[]) : [];
  return values.length + 1;
}

function addAgentVersionMeta(state: TicketWorkflowState, agentType: WorkflowAgentType, source: "agent_run" | "developer_edit") {
  const meta = state.workflowMeta ?? {};
  const createdAt = nowIso();

  return {
    ...state,
    workflowMeta: {
      ...meta,
      promptVersions: [
        ...((Array.isArray(meta.promptVersions) ? meta.promptVersions : []) as unknown[]),
        {
          version: nextVersion(meta, "promptVersions"),
          agentType,
          source,
          createdAt
        }
      ],
      outputVersions: [
        ...((Array.isArray(meta.outputVersions) ? meta.outputVersions : []) as unknown[]),
        {
          version: nextVersion(meta, "outputVersions"),
          agentType,
          source,
          createdAt
        }
      ]
    }
  };
}

async function ensureDefaultAgents() {
  for (const agent of defaultAgents) {
    await prisma.agent.upsert({
      where: { type: agent.type },
      update: agent,
      create: agent
    });
  }

  return prisma.agent.findMany({
    orderBy: { executionOrder: "asc" }
  });
}

function toApiStatus(status: string) {
  return status.toLowerCase();
}

function toJsonValue(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === null || value === undefined) {
    return Prisma.JsonNull;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getExecutedAgentTypes(state: TicketWorkflowState) {
  return [...new Set(state.trace.map((entry) => entry.agent))];
}

function getAgentType(agentName: string) {
  if (agentName === "TicketAnalyzerAgent") {
    return "TICKET_ANALYZER";
  }

  if (agentName === "PriorityClassifierAgent") {
    return "PRIORITY_CLASSIFIER";
  }

  if (agentName === "RepoSearchAgent") {
    return "REPO_SEARCH";
  }

  if (agentName === "CodeContextAgent") {
    return "CODE_CONTEXT";
  }

  if (agentName === "FixProposalAgent") {
    return "FIX_PROPOSAL";
  }

  if (agentName === "MentorDraftAgent") {
    return "MENTOR_DRAFT";
  }

  return null;
}

function getAgentOutputSnapshot(state: TicketWorkflowState, agentName: string) {
  if (agentName === "TicketAnalyzerAgent") {
    return state.analysis ?? null;
  }

  if (agentName === "PriorityClassifierAgent") {
    return state.priority ?? null;
  }

  if (agentName === "RepoSearchAgent") {
    return state.repoSearch ?? null;
  }

  if (agentName === "CodeContextAgent") {
    return state.codeContext ?? null;
  }

  if (agentName === "FixProposalAgent") {
    return state.fixProposal ?? null;
  }

  if (agentName === "MentorDraftAgent") {
    return state.mentorDraft ?? null;
  }

  return null;
}

function getAgentStatusFromState(state: TicketWorkflowState, agentName: string) {
  const failedTrace = state.trace.find((entry) => entry.agent === agentName && entry.status === "failed");
  const completedTrace = state.trace.find((entry) => entry.agent === agentName && entry.status === "completed");

  if (failedTrace) {
    return "FAILED" as const;
  }

  if (completedTrace) {
    return "SUCCESS" as const;
  }

  return "RUNNING" as const;
}

function getWorkflowProgress(status: WorkflowStatus) {
  const completedIndex = workflowAgentSequence.findIndex((agent) => agent.completedStatus === status);
  const completedCount = completedIndex >= 0 ? completedIndex + 1 : 0;

  return {
    completedAgentCount: status === "failed" ? 0 : completedCount,
    totalAgentCount: workflowAgentSequence.length,
    percent: Math.round((completedCount / workflowAgentSequence.length) * 100)
  };
}

function getNextAgentSummary(status: WorkflowStatus) {
  if (status === "ticket_analyzed") {
    return {
      name: "PriorityClassifierAgent + RepoSearchAgent",
      type: "PRIORITY_CLASSIFIER"
    };
  }

  const nextAgent = getNextWorkflowAgent(status);

  if (!nextAgent) {
    return null;
  }

  return {
    name: nextAgent.name,
    type: nextAgent.type
  };
}

function getStoredTrace(workflow: Awaited<ReturnType<typeof findWorkflowOrThrow>>) {
  return workflow.traceLogs.map((trace) => {
    const metadata = trace.metadata as {
      inputSummary?: string;
      outputSummary?: string;
      inputPayload?: unknown;
      handoffPayload?: unknown;
      promptPreview?: string;
      status?: "started" | "completed" | "failed";
      agent?: string;
      action?: string;
    } | null;

    const [agentFallback, ...actionParts] = trace.message.split(": ");

    return {
      agent: metadata?.agent ?? agentFallback,
      action: metadata?.action ?? actionParts.join(": "),
      status: metadata?.status ?? (trace.level === "ERROR" ? "failed" : "completed"),
      inputSummary: metadata?.inputSummary,
      outputSummary: metadata?.outputSummary,
      inputPayload: metadata?.inputPayload,
      handoffPayload: metadata?.handoffPayload,
      promptPreview: metadata?.promptPreview,
      createdAt: trace.createdAt.toISOString()
    };
  });
}

function rebuildWorkflowState(workflow: Awaited<ReturnType<typeof findWorkflowOrThrow>>): TicketWorkflowState {
  const state = workflow.state;

  if (!state) {
    throw new AppError(400, "Workflow state is missing");
  }

  const inputTicket = state.inputTicket as {
    ticket?: TicketWorkflowState["ticket"];
    repoConfig?: TicketWorkflowState["repoConfig"];
    title?: string;
    description?: string;
    metadata?: Record<string, unknown>;
  };
  const ticket = inputTicket.ticket ?? {
    title: workflow.ticket.title,
    description: workflow.ticket.description,
    metadata: {
      reporterName: workflow.ticket.reporterName,
      source: workflow.ticket.source,
      reporterId: workflow.ticket.reporterId
    }
  };

  if (!inputTicket.repoConfig && !workflow.repository) {
    throw new AppError(400, "Workflow repository configuration is missing");
  }

  return {
    id: workflow.id,
    status: toApiStatus(workflow.status) as WorkflowStatus,
    ticket,
    repoConfig:
      inputTicket.repoConfig ?? {
        repositoryId: workflow.repositoryId ?? workflow.repository?.id ?? "",
        repoPath: workflow.repository?.rootPath ?? "",
        maxResults: 10,
        retrievalStrategy: "hybrid",
        indexName: env.REPO_INDEX_NAME,
        forceReindex: false
      },
    analysis: (state.ticketAnalysis as TicketWorkflowState["analysis"]) ?? undefined,
    priority: (state.priorityClassification as TicketWorkflowState["priority"]) ?? undefined,
    repoSearch: (state.repoSearchResults as TicketWorkflowState["repoSearch"]) ?? undefined,
    codeContext: (state.codeContext as TicketWorkflowState["codeContext"]) ?? undefined,
    fixProposal: (state.fixProposal as TicketWorkflowState["fixProposal"]) ?? undefined,
    mentorDraft: (state.mentorDraft as TicketWorkflowState["mentorDraft"]) ?? undefined,
    errors: Array.isArray(state.error) ? (state.error as TicketWorkflowState["errors"]) : [],
    trace: getStoredTrace(workflow),
    workflowMeta: getWorkflowMeta(state.inputTicket),
    createdAt: workflow.startedAt.toISOString(),
    updatedAt: state.updatedAt.toISOString()
  };
}

async function persistWorkflowOutcome(workflowRunId: string, state: TicketWorkflowState) {
  const agents = await ensureDefaultAgents();
  const agentTypes = getExecutedAgentTypes(state);
  const nextAgent = getNextWorkflowAgent(state.status);
  const isTerminal = state.status === "mentor_draft_ready" || state.status === "failed";

  await prisma.$transaction(
    async (tx) => {
      await tx.workflowRun.update({
        where: { id: workflowRunId },
        data: {
          status: dbStatusByWorkflowStatus[state.status],
          currentAgent: state.status === "failed" ? null : nextAgent?.name ?? null,
          finishedAt: isTerminal ? new Date() : null
        }
      });

      await tx.workflowState.update({
        where: { workflowRunId },
        data: {
          inputTicket: toJsonValue({
            ticket: state.ticket,
            repoConfig: state.repoConfig,
            workflowMeta: state.workflowMeta ?? {}
          }),
          ticketAnalysis: toJsonValue(state.analysis ?? null),
          priorityClassification: toJsonValue(state.priority ?? null),
          repoSearchResults: toJsonValue(state.repoSearch ?? null),
          codeContext: toJsonValue(state.codeContext ?? null),
          fixProposal: toJsonValue(state.fixProposal ?? null),
          mentorDraft: toJsonValue(state.mentorDraft ?? null),
          error: toJsonValue(state.errors.length > 0 ? state.errors : null)
        }
      });

      await tx.traceLog.deleteMany({
        where: { workflowRunId }
      });

      await tx.agentRun.deleteMany({
        where: { workflowRunId }
      });

      await tx.repoSearchResult.deleteMany({
        where: { workflowRunId }
      });

      for (const result of state.repoSearch?.results ?? []) {
        await tx.repoSearchResult.create({
          data: {
            workflowRunId,
            filePath: result.filePath,
            chunkId: result.chunkId ?? `${result.filePath}:${result.startLine ?? 0}:${result.endLine ?? 0}`,
            startLine: result.startLine ?? 1,
            endLine: result.endLine ?? result.startLine ?? 1,
            relevanceScore: result.score,
            reason: `${result.matchType} match${result.snippet ? `: ${result.snippet.slice(0, 180)}` : ""}`
          }
        });
      }

      for (const agentName of agentTypes) {
        const agentType = getAgentType(agentName);
        const agent = agentType ? agents.find((item) => item.type === agentType) : null;

        if (!agent) {
          continue;
        }

        const failedTrace = state.trace.find((entry) => entry.agent === agentName && entry.status === "failed");
        const completedTrace = state.trace.find((entry) => entry.agent === agentName && entry.status === "completed");
        const startedTrace = state.trace.find((entry) => entry.agent === agentName && entry.status === "started");
        const status = getAgentStatusFromState(state, agentName);

        const agentRun = await tx.agentRun.create({
          data: {
            workflowRunId,
            agentId: agent.id,
            status,
            inputSnapshot: toJsonValue({
              workflowRunId,
              ticket: state.ticket,
              statusAtStart: startedTrace?.inputSummary
            }),
            outputSnapshot: toJsonValue(getAgentOutputSnapshot(state, agentName)),
            errorMessage: failedTrace?.outputSummary,
            startedAt: startedTrace ? new Date(startedTrace.createdAt) : new Date(),
            finishedAt: completedTrace || failedTrace ? new Date((completedTrace ?? failedTrace)?.createdAt ?? Date.now()) : null
          }
        });

        for (const trace of state.trace.filter((entry: WorkflowTraceEntry) => entry.agent === agentName)) {
          await tx.traceLog.create({
            data: {
              workflowRunId,
              agentRunId: agentRun.id,
              level: trace.status === "failed" ? "ERROR" : "INFO",
              message: `${trace.agent}: ${trace.action} ${trace.status}`,
              metadata: toJsonValue({
                agent: trace.agent,
                action: trace.action,
                inputSummary: trace.inputSummary,
                outputSummary: trace.outputSummary,
                inputPayload: trace.inputPayload,
                handoffPayload: trace.handoffPayload,
                promptPreview: trace.promptPreview,
                status: trace.status
              }),
              createdAt: new Date(trace.createdAt)
            }
          });
        }
      }
    },
    {
      timeout: 100000
    }
  );
}

function mapWorkflow(workflow: Awaited<ReturnType<typeof findWorkflowOrThrow>>) {
  const apiStatus = toApiStatus(workflow.status) as WorkflowStatus;
  const progress = getWorkflowProgress(apiStatus);
  const nextAgent = getNextAgentSummary(apiStatus);
  const workflowMeta = getWorkflowMeta(workflow.state?.inputTicket);

  return {
    id: workflow.id,
    status: apiStatus,
    startedAt: workflow.startedAt,
    finishedAt: workflow.finishedAt,
    currentAgent: workflow.currentAgent,
    progress,
    nextAgent,
    workflowMeta,
    requiresDeveloperDecision:
      workflow.status !== "FAILED" &&
      workflow.status !== "WAITING_FOR_REVIEW" &&
      workflow.status !== "REVIEWED" &&
      progress.completedAgentCount > 0,
    ticket: workflow.ticket,
    repository: workflow.repository
      ? {
          ...workflow.repository,
          totalBytes: workflow.repository.totalBytes.toString()
        }
      : null,
    state: workflow.state,
    agents: workflow.agentRuns.map((agentRun) => ({
      id: agentRun.id,
      agent: agentRun.agent,
      status: agentRun.status.toLowerCase(),
      inputSnapshot: agentRun.inputSnapshot,
      outputSnapshot: agentRun.outputSnapshot,
      errorMessage: agentRun.errorMessage,
      startedAt: agentRun.startedAt,
      finishedAt: agentRun.finishedAt
    })),
    trace: workflow.traceLogs.map((trace) => ({
      id: trace.id,
      agentRunId: trace.agentRunId,
      level: trace.level,
      message: trace.message,
      metadata: trace.metadata,
      createdAt: trace.createdAt
    })),
    repoSearchResults: workflow.repoSearchResults,
    mentorReview: workflow.mentorReview
  };
}

function mapWorkflowSummary(workflow: Prisma.WorkflowRunGetPayload<{ include: typeof workflowSummaryInclude }>) {
  const apiStatus = toApiStatus(workflow.status) as WorkflowStatus;

  return {
    id: workflow.id,
    status: apiStatus,
    startedAt: workflow.startedAt,
    finishedAt: workflow.finishedAt,
    currentAgent: workflow.currentAgent,
    progress: getWorkflowProgress(apiStatus),
    nextAgent: getNextAgentSummary(apiStatus),
    requiresDeveloperDecision:
      workflow.status !== "FAILED" &&
      workflow.status !== "WAITING_FOR_REVIEW" &&
      workflow.status !== "REVIEWED" &&
      getWorkflowProgress(apiStatus).completedAgentCount > 0,
    workflowMeta: getWorkflowMeta(workflow.state?.inputTicket),
    ticket: {
      id: workflow.ticket.id,
      title: workflow.ticket.title,
      reporterName: workflow.ticket.reporterName,
      source: workflow.ticket.source,
      createdAt: workflow.ticket.createdAt
    },
    repository: workflow.repository
      ? {
          id: workflow.repository.id,
          name: workflow.repository.name,
          status: workflow.repository.status,
          fileCount: workflow.repository.fileCount
        }
      : null,
    mentorReview: workflow.mentorReview
      ? {
          decision: workflow.mentorReview.decision,
          reviewedAt: workflow.mentorReview.reviewedAt
        }
      : null
  };
}

async function findWorkflowOrThrow(id: string) {
  const workflow = await prisma.workflowRun.findUnique({
    where: { id },
    include: workflowInclude
  });

  if (!workflow) {
    throw new AppError(404, "Workflow not found");
  }

  return workflow;
}

async function runNextAndPersist(workflowRunId: string, state: TicketWorkflowState) {
  const agent = getNextWorkflowAgent(state.status);
  const nextState =
    state.status === "ticket_analyzed" ? await runPriorityAndRepoSearchAgents(state) : await runNextWorkflowAgent(state);
  const versionedState =
    state.status === "ticket_analyzed"
      ? addAgentVersionMeta(
          addAgentVersionMeta(nextState, "PRIORITY_CLASSIFIER", "agent_run"),
          "REPO_SEARCH",
          "agent_run"
        )
      : agent
        ? addAgentVersionMeta(nextState, agent.type, "agent_run")
        : nextState;
  await persistWorkflowOutcome(workflowRunId, versionedState);
}

function enqueueNextAgent(workflowRunId: string, state: TicketWorkflowState, label: string) {
  return workflowJobQueue.enqueue({
    workflowRunId,
    label,
    actionType: "NEXT_AGENT",
    actionPayload: { workflowRunId, state } as Prisma.InputJsonValue
  });
}

function enqueueRerunAgent(
  workflowRunId: string,
  state: TicketWorkflowState,
  input: RerunWorkflowAgentInput,
  label: string
) {
  return workflowJobQueue.enqueue({
    workflowRunId,
    label,
    actionType: "RERUN_AGENT",
    actionPayload: { workflowRunId, state, input } as Prisma.InputJsonValue
  });
}

function getEditableAgentTypes(state: TicketWorkflowState) {
  const completedIndex = workflowAgentSequence.findIndex((agent) => agent.completedStatus === state.status);

  if (completedIndex < 0 && state.status !== "failed") {
    return [];
  }

  if (state.status === "failed") {
    return workflowAgentSequence
      .filter((agent) => state.trace.some((entry) => entry.agent === agent.name && entry.status === "completed"))
      .map((agent) => agent.type);
  }

  return workflowAgentSequence.slice(0, completedIndex + 1).map((agent) => agent.type);
}

function clearOutputsFromAgent(state: TicketWorkflowState, agentType: WorkflowAgentType) {
  const startIndex = getAgentSequenceIndex(agentType);
  const staleAgentTypes = workflowAgentSequence.slice(startIndex).map((agent) => agent.type);
  const invalidatedTrace = state.trace.filter((entry) => {
    const traceAgent = workflowAgentSequence.find((agent) => agent.name === entry.agent);
    return traceAgent ? getAgentSequenceIndex(traceAgent.type) >= startIndex : false;
  });
  const nextState: TicketWorkflowState = {
    ...state,
    status: workflowAgentSequence[startIndex].expectedStatus,
    errors: [],
    trace: state.trace.filter((entry) => {
      const traceAgent = workflowAgentSequence.find((agent) => agent.name === entry.agent);
      return traceAgent ? getAgentSequenceIndex(traceAgent.type) < startIndex : true;
    }),
    workflowMeta: {
      ...(state.workflowMeta ?? {}),
      staleAgentTypes,
      reruns: [
        ...(((state.workflowMeta?.reruns as unknown[]) ?? [])),
        {
          agentType,
          invalidatedAgentTypes: staleAgentTypes,
          invalidatedTrace,
          createdAt: nowIso()
        }
      ]
    },
    updatedAt: nowIso()
  };

  for (const type of staleAgentTypes) {
    const field = outputFieldByAgentType[type];
    delete nextState[field];
  }

  return nextState;
}

function clearOutputsAfterAgent(state: TicketWorkflowState, agentType: WorkflowAgentType) {
  const completedIndex = getAgentSequenceIndex(agentType);
  const staleAgentTypes = workflowAgentSequence.slice(completedIndex + 1).map((agent) => agent.type);
  const invalidatedTrace = state.trace.filter((entry) => {
    const traceAgent = workflowAgentSequence.find((agent) => agent.name === entry.agent);
    return traceAgent ? getAgentSequenceIndex(traceAgent.type) > completedIndex : false;
  });
  const nextState: TicketWorkflowState = {
    ...state,
    status: workflowAgentSequence[completedIndex].completedStatus,
    errors: [],
    trace: state.trace.filter((entry) => {
      const traceAgent = workflowAgentSequence.find((agent) => agent.name === entry.agent);
      return traceAgent ? getAgentSequenceIndex(traceAgent.type) <= completedIndex : true;
    }),
    workflowMeta: {
      ...(state.workflowMeta ?? {}),
      staleAgentTypes,
      invalidations: [
        ...(((state.workflowMeta?.invalidations as unknown[]) ?? [])),
        {
          agentType,
          invalidatedAgentTypes: staleAgentTypes,
          invalidatedTrace,
          createdAt: nowIso()
        }
      ]
    },
    updatedAt: nowIso()
  };

  for (const type of staleAgentTypes) {
    const field = outputFieldByAgentType[type];
    delete nextState[field];
  }

  return nextState;
}

function replaceAgentOutput(state: TicketWorkflowState, input: UpdateWorkflowOutputInput) {
  const agentType = input.agentType as WorkflowAgentType;
  const editableTypes = getEditableAgentTypes(state);

  if (!editableTypes.includes(agentType)) {
    throw new AppError(400, "Only completed agent outputs can be edited");
  }

  const parsedOutput = parseAgentOutput(agentType, input.output);
  const stateField = outputFieldByAgentType[agentType];
  const editedState = clearOutputsAfterAgent(state, agentType);

  return {
    ...editedState,
    [stateField]: parsedOutput,
    workflowMeta: {
      ...(editedState.workflowMeta ?? {}),
      edits: [
        ...(((state.workflowMeta?.edits as unknown[]) ?? [])),
        {
          agentType,
          note: input.note,
          createdAt: nowIso()
        }
      ]
    },
    updatedAt: nowIso()
  } as TicketWorkflowState;
}

export const workflowService = {
  async dashboard() {
    const [workflowCounts, agentRuns, reviews, traceLogs] = await Promise.all([
      prisma.workflowRun.groupBy({
        by: ["status"],
        _count: {
          _all: true
        }
      }),
      prisma.agentRun.findMany({
        include: {
          agent: true
        },
        orderBy: {
          startedAt: "desc"
        },
        take: 500
      }),
      prisma.mentorReview.groupBy({
        by: ["decision"],
        _count: {
          _all: true
        }
      }),
      prisma.traceLog.findMany({
        orderBy: {
          createdAt: "desc"
        },
        take: 1000
      })
    ]);

    const completedAgentRuns = agentRuns.filter((run) => run.finishedAt);
    const totalLatency = completedAgentRuns.reduce(
      (sum, run) => sum + (run.finishedAt!.getTime() - run.startedAt.getTime()),
      0
    );
    const fallbackCount = traceLogs.filter((trace) => {
      const metadata = trace.metadata as { outputSummary?: string } | null;
      return metadata?.outputSummary?.toLowerCase().includes("fallback") ?? false;
    }).length;
    const rerunCount = traceLogs.filter((trace) => trace.message.toLowerCase().includes("rerun")).length;
    const editCount = traceLogs.filter((trace) => trace.message.toLowerCase().includes("edited")).length;

    return {
      workflowsByStatus: Object.fromEntries(workflowCounts.map((row) => [row.status, row._count._all])),
      averageAgentLatencyMs:
        completedAgentRuns.length > 0 ? Math.round(totalLatency / completedAgentRuns.length) : 0,
      agentLatencyByType: Object.fromEntries(
        Object.entries(
          completedAgentRuns.reduce<Record<string, { total: number; count: number }>>((accumulator, run) => {
            const type = run.agent.type;
            accumulator[type] ??= { total: 0, count: 0 };
            accumulator[type].total += run.finishedAt!.getTime() - run.startedAt.getTime();
            accumulator[type].count += 1;
            return accumulator;
          }, {})
        ).map(([type, value]) => [type, Math.round(value.total / value.count)])
      ),
      fallbackRate:
        traceLogs.length > 0 ? Number((fallbackCount / traceLogs.length).toFixed(3)) : 0,
      fallbackCount,
      rerunCount,
      editCount,
      mentorDecisions: Object.fromEntries(reviews.map((row) => [row.decision, row._count._all])),
      queue: await workflowJobQueue.stats()
    };
  },

  async quality() {
    const agentLabels: Record<string, string> = {
      TICKET_ANALYZER: "Ticket Analyzer",
      PRIORITY_CLASSIFIER: "Priority Classifier",
      REPO_SEARCH: "Repo Search",
      CODE_CONTEXT: "Code Context",
      FIX_PROPOSAL: "Fix Proposal",
      MENTOR_DRAFT: "Mentor Draft"
    };

    const [agentRuns, reviews, workflowStates] = await Promise.all([
      prisma.agentRun.findMany({
        include: {
          agent: true,
          traceLogs: true,
          workflowRun: {
            include: {
              mentorReview: true
            }
          }
        },
        orderBy: { finishedAt: "desc" },
        take: 2000
      }),
      prisma.mentorReview.groupBy({
        by: ["decision"],
        _count: { _all: true }
      }),
      prisma.workflowState.findMany({
        select: {
          workflowRunId: true,
          inputTicket: true
        }
      })
    ]);

    const totalReviewed = reviews.reduce((sum, r) => sum + r._count._all, 0);
    const approvedCount = reviews.find((r) => r.decision === "APPROVED")?._count._all ?? 0;
    const rejectedCount = reviews.find((r) => r.decision === "REJECTED")?._count._all ?? 0;
    const needsInfoCount = reviews.find((r) => r.decision === "NEED_MORE_INFORMATION")?._count._all ?? 0;

    const editCountsByAgent: Record<string, number> = {};
    const rerunCountsByAgent: Record<string, number> = {};
    const workflowEditsByAgent: Record<string, Set<string>> = {};
    const workflowRerunsByAgent: Record<string, Set<string>> = {};

    for (const state of workflowStates) {
      const meta = getWorkflowMeta(state.inputTicket);
      const edits = Array.isArray(meta.edits) ? meta.edits as { agentType?: string }[] : [];
      const reruns = Array.isArray(meta.reruns) ? meta.reruns as { agentType?: string }[] : [];

      for (const edit of edits) {
        const type = edit.agentType ?? "unknown";
        editCountsByAgent[type] = (editCountsByAgent[type] ?? 0) + 1;
        workflowEditsByAgent[type] ??= new Set();
        workflowEditsByAgent[type].add(state.workflowRunId);
      }

      for (const rerun of reruns) {
        const type = rerun.agentType ?? "unknown";
        rerunCountsByAgent[type] = (rerunCountsByAgent[type] ?? 0) + 1;
        workflowRerunsByAgent[type] ??= new Set();
        workflowRerunsByAgent[type].add(state.workflowRunId);
      }
    }

    const agents: Record<string, {
      label: string;
      totalRuns: number;
      llmRuns: number;
      fallbackRuns: number;
      averageLatencyMs: number;
      reviewedWorkflows: number;
      approvedWorkflows: number;
      rejectedWorkflows: number;
      needsInfoWorkflows: number;
      totalEdits: number;
      totalReruns: number;
      workflowsWithEdits: number;
      workflowsWithReruns: number;
    }> = {};

    const reviewedSet = new Set<string>();

    for (const run of agentRuns) {
      const type = run.agent.type;
      if (!agents[type]) {
        agents[type] = {
          label: agentLabels[type] ?? type,
          totalRuns: 0,
          llmRuns: 0,
          fallbackRuns: 0,
          averageLatencyMs: 0,
          reviewedWorkflows: 0,
          approvedWorkflows: 0,
          rejectedWorkflows: 0,
          needsInfoWorkflows: 0,
          totalEdits: 0,
          totalReruns: 0,
          workflowsWithEdits: 0,
          workflowsWithReruns: 0
        };
      }

      agents[type].totalRuns++;

      const outputTrace = run.traceLogs.find((t) => {
        const meta = t.metadata as { status?: string } | null;
        return meta?.status === "completed";
      });
      const outputSummary =
        (outputTrace?.metadata as { outputSummary?: string } | null)?.outputSummary ?? "";

      if (outputSummary.startsWith("LLM fallback used:")) {
        agents[type].fallbackRuns++;
      } else if (outputSummary.startsWith("LLM ")) {
        agents[type].llmRuns++;
      } else {
        agents[type].fallbackRuns++;
      }

      if (run.finishedAt) {
        const latency = run.finishedAt.getTime() - run.startedAt.getTime();
        agents[type].averageLatencyMs =
          (agents[type].averageLatencyMs * (agents[type].totalRuns - 1) + latency) / agents[type].totalRuns;
      }

      const review = run.workflowRun.mentorReview;
      if (review && !reviewedSet.has(run.workflowRunId)) {
        reviewedSet.add(run.workflowRunId);
        agents[type].reviewedWorkflows++;

        if (review.decision === "APPROVED") agents[type].approvedWorkflows++;
        else if (review.decision === "REJECTED") agents[type].rejectedWorkflows++;
        else agents[type].needsInfoWorkflows++;
      }
    }

    for (const type of Object.keys(agents)) {
      agents[type].averageLatencyMs = Math.round(agents[type].averageLatencyMs);
      agents[type].totalEdits = editCountsByAgent[type] ?? 0;
      agents[type].totalReruns = rerunCountsByAgent[type] ?? 0;
      agents[type].workflowsWithEdits = workflowEditsByAgent[type]?.size ?? 0;
      agents[type].workflowsWithReruns = workflowRerunsByAgent[type]?.size ?? 0;
    }

    return {
      totalReviewed,
      approvalRate: totalReviewed > 0 ? Number((approvedCount / totalReviewed).toFixed(3)) : 0,
      reworkRate: totalReviewed > 0 ? Number((needsInfoCount / totalReviewed).toFixed(3)) : 0,
      rejectionRate: totalReviewed > 0 ? Number((rejectedCount / totalReviewed).toFixed(3)) : 0,
      agents,
      agentLabels
    };
  },

  async agentQualityDetail(agentType: string, page: number = 1, limit: number = 20) {
    limit = Math.min(Math.max(limit, 1), 100);
    page = Math.max(page, 1);

    const [agentRuns, total] = await Promise.all([
      prisma.agentRun.findMany({
        where: { agent: { type: agentType as AgentType } },
        include: {
          traceLogs: true,
          workflowRun: {
            include: {
              ticket: true,
              mentorReview: true,
              state: { select: { inputTicket: true } }
            }
          }
        },
        orderBy: { finishedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.agentRun.count({ where: { agent: { type: agentType as AgentType } } })
    ]);

    const items = agentRuns.map((run) => {
      const outputTrace = run.traceLogs.find((t) => {
        const meta = t.metadata as { status?: string } | null;
        return meta?.status === "completed";
      });
      const outputSummary =
        (outputTrace?.metadata as { outputSummary?: string } | null)?.outputSummary ?? "";
      const usedLlm = outputSummary.startsWith("LLM ") && !outputSummary.startsWith("LLM fallback used:");

      const meta = getWorkflowMeta(run.workflowRun.state?.inputTicket);
      const edits = (Array.isArray(meta.edits) ? meta.edits as { agentType?: string }[] : [])
        .filter((e) => e.agentType === agentType).length;
      const reruns = (Array.isArray(meta.reruns) ? meta.reruns as { agentType?: string }[] : [])
        .filter((r) => r.agentType === agentType).length;

      return {
        workflowRunId: run.workflowRunId,
        ticketTitle: run.workflowRun.ticket.title,
        workflowStatus: run.workflowRun.status.toLowerCase(),
        agentRunId: run.id,
        usedLlm,
        latencyMs: run.finishedAt ? run.finishedAt.getTime() - run.startedAt.getTime() : null,
        mentorDecision: run.workflowRun.mentorReview?.decision ?? null,
        editCount: edits,
        rerunCount: reruns,
        createdAt: run.startedAt.toISOString()
      };
    });

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1)
    };
  },

  async list(input: { status?: string; limit?: number } = {}) {
    const workflows = await prisma.workflowRun.findMany({
      where: input.status
        ? {
            status: input.status.toUpperCase() as DbWorkflowStatus
          }
        : undefined,
      include: workflowInclude,
      orderBy: {
        startedAt: "desc"
      },
      take: input.limit ?? 50
    });

    return workflows.map((workflow) => mapWorkflow(workflow));
  },

  async listSummaries(input: { status?: string; limit?: number; page?: number; search?: string } = {}) {
    const limit = Math.min(Math.max(input.limit ?? 10, 1), 100);
    const page = Math.max(input.page ?? 1, 1);
    const search = input.search?.trim();
    const where: Prisma.WorkflowRunWhereInput = {
      ...(input.status ? { status: input.status.toUpperCase() as DbWorkflowStatus } : {}),
      ...(search
        ? {
            ticket: {
              title: {
                contains: search,
                mode: "insensitive"
              }
            }
          }
        : {})
    };

    const [workflows, total] = await Promise.all([
      prisma.workflowRun.findMany({
        where,
        include: workflowSummaryInclude,
        orderBy: {
          startedAt: "desc"
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.workflowRun.count({ where })
    ]);

    return {
      items: workflows.map((workflow) => mapWorkflowSummary(workflow)),
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1)
    };
  },

  async create(input: CreateWorkflowInput) {
    await ensureDefaultAgents();
    const repositoryId =
      input.repositoryId ?? (await repositoryService.ensureDefaultCodebaseRepository()).id;

    const repository = await prisma.codeRepository.findUnique({
      where: { id: repositoryId }
    });

    if (!repository) {
      throw new AppError(404, "Repository not found");
    }

    if (repository.status !== "READY") {
      throw new AppError(400, "Repository is not ready for workflow analysis");
    }

    const created = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.create({
        data: {
          title: input.ticket.title,
          description: input.ticket.description,
          reporterName: input.ticket.reporterName,
          source: input.ticket.source,
          reporterId: input.ticket.reporterId
        }
      });

      const run = await tx.workflowRun.create({
        data: {
          ticketId: ticket.id,
          repositoryId,
          status: "CREATED",
          currentAgent: "TicketAnalyzerAgent"
        }
      });

      await tx.workflowState.create({
        data: {
          workflowRunId: run.id,
          inputTicket: {
            ticket: {
              title: ticket.title,
              description: ticket.description,
              metadata: {
                reporterName: ticket.reporterName,
                source: ticket.source,
                reporterId: ticket.reporterId
              }
            },
            repoConfig: {
              repositoryId,
              repoPath: repository.rootPath,
              maxResults: input.maxResults,
              retrievalStrategy: input.retrievalStrategy,
              indexName: input.indexName ?? env.REPO_INDEX_NAME,
              forceReindex: input.forceReindex
            }
          }
        }
      });

      return { ticket, run };
    });

    const timestamp = nowIso();
    const initialState: TicketWorkflowState = {
      id: created.run.id,
      status: "created",
      ticket: {
        title: created.ticket.title,
        description: created.ticket.description,
        metadata: {
          reporterName: created.ticket.reporterName,
          source: created.ticket.source,
          reporterId: created.ticket.reporterId
        }
      },
      repoConfig: {
        repositoryId,
        repoPath: repository.rootPath,
        maxResults: input.maxResults,
        retrievalStrategy: input.retrievalStrategy,
        indexName: input.indexName ?? env.REPO_INDEX_NAME,
        forceReindex: input.forceReindex
      },
      errors: [],
      trace: [],
      workflowMeta: {
        edits: [],
        reruns: [],
        staleAgentTypes: []
      },
      createdAt: timestamp,
      updatedAt: timestamp
    };

    enqueueNextAgent(created.run.id, initialState, "Run first workflow agent");
    return mapWorkflow(await findWorkflowOrThrow(created.run.id));
  },

  async getById(id: string) {
    return mapWorkflow(await findWorkflowOrThrow(id));
  },

  async acceptAgent(id: string, input: AcceptWorkflowAgentInput = { runAsync: false }) {
    const workflow = await findWorkflowOrThrow(id);
    const state = rebuildWorkflowState(workflow);

    if (state.status === "failed") {
      throw new AppError(400, "Failed workflow cannot continue until the failing agent is rerun");
    }

    if (state.status === "mentor_draft_ready") {
      throw new AppError(400, "All agents are complete. Submit the mentor draft for review instead.");
    }

    if (!getNextWorkflowAgent(state.status)) {
      throw new AppError(400, "No next agent is available for the current workflow status");
    }

    enqueueNextAgent(id, state, `Run ${getNextWorkflowAgent(state.status)?.name ?? "next agent"}`);
    return mapWorkflow(await findWorkflowOrThrow(id));
  },

  async rerunAgent(id: string, input: RerunWorkflowAgentInput = { runAsync: false }) {
    const workflow = await findWorkflowOrThrow(id);
    const state = rebuildWorkflowState(workflow);

    if (state.status === "created") {
      enqueueNextAgent(id, state, "Run first workflow agent");
      return mapWorkflow(await findWorkflowOrThrow(id));
    }

    const rerunBaseState = input.agentType
      ? clearOutputsFromAgent(state, input.agentType as WorkflowAgentType)
      : state;
    enqueueRerunAgent(id, rerunBaseState, input, input.agentType ? `Rerun ${input.agentType}` : "Rerun completed agent");
    return mapWorkflow(await findWorkflowOrThrow(id));
  },

  async updateAgentOutput(id: string, input: UpdateWorkflowOutputInput) {
    const workflow = await findWorkflowOrThrow(id);
    const state = rebuildWorkflowState(workflow);

    if (state.status === "failed") {
      throw new AppError(400, "Failed workflow output cannot be edited until the failing agent is rerun");
    }

    if (workflow.status === "WAITING_FOR_REVIEW" || workflow.status === "REVIEWED") {
      throw new AppError(400, "Submitted or reviewed workflows cannot be edited");
    }

    const updatedState = addAgentVersionMeta(
      replaceAgentOutput(state, input),
      input.agentType as WorkflowAgentType,
      "developer_edit"
    );
    await persistWorkflowOutcome(id, updatedState);
    await prisma.traceLog.create({
      data: {
        workflowRunId: id,
        level: "INFO",
        message: `Developer edited ${input.agentType} output`,
        metadata: {
          action: "Developer edited agent output",
          agentType: input.agentType,
          note: input.note,
          stateField: dbStateFieldByAgentType[input.agentType as WorkflowAgentType],
          nextStatus: stateStatusByAgentType[input.agentType as WorkflowAgentType],
          createdAt: nowIso()
        }
      }
    });

    return mapWorkflow(await findWorkflowOrThrow(id));
  },

  async submitForReview(id: string) {
    const workflow = await findWorkflowOrThrow(id);

    if (workflow.status !== "MENTOR_DRAFT_READY") {
      throw new AppError(400, "Workflow mentor draft is not ready for review submission");
    }

    await prisma.$transaction([
      prisma.workflowRun.update({
        where: { id },
        data: {
          status: "WAITING_FOR_REVIEW",
          currentAgent: null
        }
      }),
      prisma.traceLog.create({
        data: {
          workflowRunId: id,
          level: "INFO",
          message: "Developer submitted mentor draft for review",
          metadata: {
            previousStatus: workflow.status,
            nextStatus: "WAITING_FOR_REVIEW"
          }
        }
      })
    ]);

    return mapWorkflow(await findWorkflowOrThrow(id));
  },

  async review(id: string, input: ReviewWorkflowInput) {
    const workflow = await findWorkflowOrThrow(id);
    const mentor = input.mentorId
      ? await prisma.user.findUnique({ where: { id: input.mentorId } })
      : await prisma.user.upsert({
          where: { email: "mentor@ticketassist.local" },
          update: {
            name: "Default Mentor",
            role: "MENTOR"
          },
          create: {
            name: "Default Mentor",
            email: "mentor@ticketassist.local",
            role: "MENTOR"
          }
        });

    if (!mentor) {
      throw new AppError(404, "Mentor not found");
    }

    const nextStatus = input.decision === "NEED_MORE_INFORMATION" ? "MENTOR_DRAFT_READY" : "REVIEWED";
    const workflowMeta = getWorkflowMeta(workflow.state?.inputTicket);
    const reviewRequests = [
      ...(((workflowMeta.reviewRequests as unknown[]) ?? [])),
      {
        decision: input.decision,
        comment: input.comment,
        mentorId: mentor.id,
        createdAt: nowIso()
      }
    ];

    await prisma.$transaction([
      prisma.mentorReview.upsert({
        where: { workflowRunId: workflow.id },
        update: {
          decision: input.decision,
          comment: input.comment,
          mentorId: mentor.id,
          reviewedAt: new Date()
        },
        create: {
          workflowRunId: workflow.id,
          mentorId: mentor.id,
          decision: input.decision,
          comment: input.comment
        }
      }),
      prisma.workflowRun.update({
        where: { id: workflow.id },
        data: {
          status: nextStatus,
          currentAgent: null
        }
      }),
      prisma.workflowState.update({
        where: { workflowRunId: workflow.id },
        data: {
          inputTicket: toJsonValue({
            ...((workflow.state?.inputTicket as Record<string, unknown>) ?? {}),
            workflowMeta: {
              ...workflowMeta,
              reviewRequests
            }
          }),
          reviewDecision: {
            decision: input.decision,
            comment: input.comment,
            reviewedAt: new Date().toISOString()
          }
        }
      }),
      prisma.traceLog.create({
        data: {
          workflowRunId: workflow.id,
          level: "INFO",
          message: `Mentor review submitted: ${input.decision}`,
          metadata: {
            mentorId: mentor.id,
            nextStatus
          }
        }
      })
    ]);

    return mapWorkflow(await findWorkflowOrThrow(id));
  }
};

workflowJobQueue.registerWorker("NEXT_AGENT", async (payload: any) => {
  await runNextAndPersist(payload.workflowRunId, payload.state);
});

workflowJobQueue.registerWorker("RERUN_AGENT", async (payload: any) => {
  const { workflowRunId, state, input } = payload;
  const nextState = input.agentType
    ? await runNextWorkflowAgent(state)
    : await rerunCompletedWorkflowAgent(state);

  if (input.agentType) {
    const rerunIndex = getAgentSequenceIndex(input.agentType as WorkflowAgentType);
    nextState.workflowMeta = {
      ...(nextState.workflowMeta ?? {}),
      staleAgentTypes: workflowAgentSequence.slice(rerunIndex + 1).map((agent) => agent.type)
    };
  } else {
    const rerunAgent = getAgentForCompletedStatus(state.status);
    nextState.workflowMeta = {
      ...(nextState.workflowMeta ?? {}),
      reruns: [
        ...(((state.workflowMeta?.reruns as unknown[]) ?? [])),
        {
          agentType: rerunAgent?.type,
          invalidatedAgentTypes: rerunAgent ? [rerunAgent.type] : [],
          invalidatedTrace: rerunAgent
            ? state.trace.filter((entry: WorkflowTraceEntry) => entry.agent === rerunAgent.name)
            : [],
          createdAt: nowIso()
        }
      ]
    };
  }

  const versionedState = input.agentType
    ? addAgentVersionMeta(nextState, input.agentType as WorkflowAgentType, "agent_run")
    : nextState;

  await persistWorkflowOutcome(workflowRunId, versionedState);
});
