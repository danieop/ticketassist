import { Prisma, type WorkflowStatus as DbWorkflowStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../middlewares/error-handler.js";
import { repositoryService } from "./repository.service.js";
import { runTicketWorkflow } from "./workflow.graph.js";
import type { TicketWorkflowState, WorkflowStatus } from "./workflow-state.js";
import { nowIso } from "./workflow-state.js";
import type {
  CreateWorkflowInput,
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

async function persistWorkflowOutcome(workflowRunId: string, state: TicketWorkflowState) {
  const agents = await ensureDefaultAgents();
  const agentTypes = getExecutedAgentTypes(state);

  await prisma.$transaction(
    async (tx) => {
      await tx.workflowRun.update({
        where: { id: workflowRunId },
        data: {
          status: dbStatusByWorkflowStatus[state.status],
          currentAgent: null,
          finishedAt: new Date()
        }
      });

      await tx.workflowState.update({
        where: { workflowRunId },
        data: {
          inputTicket: toJsonValue(state.ticket),
          ticketAnalysis: toJsonValue(state.analysis ?? null),
          priorityClassification: toJsonValue(state.priority ?? null),
          repoSearchResults: toJsonValue(state.repoSearch ?? null),
          codeContext: toJsonValue(state.codeContext ?? null),
          fixProposal: toJsonValue(state.fixProposal ?? null),
          mentorDraft: toJsonValue(state.mentorDraft ?? null),
          error: toJsonValue(state.errors.length > 0 ? state.errors : null)
        }
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
        const status = failedTrace ? "FAILED" : completedTrace ? "SUCCESS" : "RUNNING";

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

        for (const trace of state.trace.filter((entry) => entry.agent === agentName)) {
          await tx.traceLog.create({
            data: {
              workflowRunId,
              agentRunId: agentRun.id,
              level: trace.status === "failed" ? "ERROR" : "INFO",
              message: `${trace.agent}: ${trace.action} ${trace.status}`,
              metadata: toJsonValue({
                inputSummary: trace.inputSummary,
                outputSummary: trace.outputSummary,
                status: trace.status
              }),
              createdAt: new Date(trace.createdAt)
            }
          });
        }
      }
    },
    {
      timeout: 20000
    }
  );
}

function mapWorkflow(workflow: Awaited<ReturnType<typeof findWorkflowOrThrow>>) {
  return {
    id: workflow.id,
    status: toApiStatus(workflow.status),
    startedAt: workflow.startedAt,
    finishedAt: workflow.finishedAt,
    currentAgent: workflow.currentAgent,
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

export const workflowService = {
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
          inputTicket: input.ticket
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
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const finalState = await runTicketWorkflow(initialState);
    await persistWorkflowOutcome(created.run.id, finalState);

    return mapWorkflow(await findWorkflowOrThrow(created.run.id));
  },

  async getById(id: string) {
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
          status: "REVIEWED",
          currentAgent: null
        }
      }),
      prisma.workflowState.update({
        where: { workflowRunId: workflow.id },
        data: {
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
            mentorId: mentor.id
          }
        }
      })
    ]);

    return mapWorkflow(await findWorkflowOrThrow(id));
  }
};
