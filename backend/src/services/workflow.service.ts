import { prisma } from "../config/prisma.js";
import { AppError } from "../middlewares/error-handler.js";
import { repositoryService } from "./repository.service.js";
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

function buildDraftArtifacts(ticket: CreateWorkflowInput["ticket"]) {
  const shortTitle = ticket.title.toLowerCase();
  const suspectedArea = shortTitle.includes("checkout")
    ? "checkout/payment flow"
    : shortTitle.includes("invoice")
      ? "billing/export flow"
      : "feature module related to the ticket symptoms";

  return {
    ticketAnalysis: {
      summary: `${ticket.title} needs focused analysis before any code change is proposed.`,
      symptoms: [
        "Customer-facing bug report has enough detail to start triage",
        "Backend should preserve trace per sequential agent",
        "Final output must wait for mentor review"
      ],
      missingInfo: ["Affected user or account IDs", "Release/version window", "Relevant logs or request IDs"]
    },
    priorityClassification: {
      level: "P2",
      reason: "Dummy classifier marks this as important until business impact is confirmed.",
      impact: "Potential user workflow degradation; mentor should confirm severity."
    },
    repoSearchResults: [
      {
        filePath: "backend/src/modules/example.service.ts",
        chunkId: "dummy-context-1",
        startLine: 12,
        endLine: 48,
        relevanceScore: 0.91,
        reason: `Likely service layer for ${suspectedArea}.`
      },
      {
        filePath: "backend/src/modules/example.controller.ts",
        chunkId: "dummy-context-2",
        startLine: 4,
        endLine: 38,
        relevanceScore: 0.84,
        reason: "Likely API entrypoint for reproducing the reported behavior."
      }
    ],
    codeContext: [
      {
        file: "example.service.ts",
        note: "Check guards and error handling around the reported path."
      },
      {
        file: "example.controller.ts",
        note: "Confirm request validation and response mapping for the failing scenario."
      }
    ],
    fixProposal: {
      title: `Investigate ${suspectedArea} before implementation`,
      steps: [
        "Reproduce with the reporter-provided context",
        "Inspect scoped files from repository search",
        "Add failing regression coverage before code changes",
        "Draft patch only after mentor approves assumptions"
      ],
      risks: [
        "Dummy workflow does not run AI or inspect real repository content yet",
        "Priority may change after production impact is confirmed"
      ]
    },
    mentorDraft: {
      response:
        "This workflow produced a review draft only. Mentor should verify assumptions, request missing data if needed, and approve or reject the proposed next steps.",
      checklist: [
        "Confirm missing reproduction data",
        "Validate scoped files are relevant",
        "Approve test-first implementation plan",
        "Do not mark the ticket fixed from this draft alone"
      ]
    }
  };
}

function mapWorkflow(workflow: Awaited<ReturnType<typeof findWorkflowOrThrow>>) {
  return {
    id: workflow.id,
    status: workflow.status,
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
      status: agentRun.status,
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
  async create(input: CreateWorkflowInput) {
    const agents = await ensureDefaultAgents();
    const artifacts = buildDraftArtifacts(input.ticket);
    const repositoryId =
      input.repositoryId ?? (await repositoryService.ensureDefaultCodebaseRepository()).id;

    if (repositoryId) {
      const repository = await prisma.codeRepository.findUnique({
        where: { id: repositoryId }
      });

      if (!repository) {
        throw new AppError(404, "Repository not found");
      }

      if (repository.status !== "READY") {
        throw new AppError(400, "Repository is not ready for workflow analysis");
      }
    }

    const workflow = await prisma.$transaction(async (tx) => {
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
          status: "WAITING_FOR_REVIEW",
          currentAgent: "Human Review",
          finishedAt: new Date()
        }
      });

      await tx.workflowState.create({
        data: {
          workflowRunId: run.id,
          inputTicket: input.ticket,
          ticketAnalysis: artifacts.ticketAnalysis,
          priorityClassification: artifacts.priorityClassification,
          repoSearchResults: artifacts.repoSearchResults,
          codeContext: artifacts.codeContext,
          fixProposal: artifacts.fixProposal,
          mentorDraft: artifacts.mentorDraft
        }
      });

      for (const result of artifacts.repoSearchResults) {
        await tx.repoSearchResult.create({
          data: {
            workflowRunId: run.id,
            ...result
          }
        });
      }

      for (const agent of agents) {
        const agentRun = await tx.agentRun.create({
          data: {
            workflowRunId: run.id,
            agentId: agent.id,
            status: "SUCCESS",
            inputSnapshot: { ticketId: ticket.id, workflowRunId: run.id },
            outputSnapshot: { message: `${agent.name} completed using dummy data.` },
            finishedAt: new Date()
          }
        });

        await tx.traceLog.create({
          data: {
            workflowRunId: run.id,
            agentRunId: agentRun.id,
            level: "INFO",
            message: `${agent.name} completed successfully.`,
            metadata: {
              executionOrder: agent.executionOrder,
              agentType: agent.type
            }
          }
        });
      }

      return tx.workflowRun.findUniqueOrThrow({
        where: { id: run.id },
        include: workflowInclude
      });
    });

    return mapWorkflow(workflow);
  },

  async getById(id: string) {
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
