import { prisma } from "../config/prisma.js";
import { type Prisma } from "@prisma/client";

const handlers = new Map<string, (payload: any) => Promise<void>>();

let isPolling = false;
let activeJobId: string | null = null;

async function pollQueue() {
  if (isPolling) return;
  isPolling = true;

  try {
    const job = await prisma.$transaction(async (tx) => {
      const pendingJob = await tx.workflowJob.findFirst({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" }
      });

      if (!pendingJob) return null;

      return tx.workflowJob.update({
        where: { id: pendingJob.id },
        data: {
          status: "RUNNING",
          startedAt: new Date()
        }
      });
    });

    if (!job) {
      isPolling = false;
      return;
    }

    activeJobId = job.id;

    const handler = handlers.get(job.actionType);
    if (!handler) {
      throw new Error(`No handler registered for actionType: ${job.actionType}`);
    }

    try {
      await handler(job.actionPayload);

      await prisma.workflowJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          finishedAt: new Date()
        }
      });
    } catch (error) {
      await prisma.workflowJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          error: error instanceof Error ? error.message : "Workflow job failed",
          finishedAt: new Date()
        }
      });
    } finally {
      activeJobId = null;
    }

    // Process next job immediately
    setTimeout(() => {
      isPolling = false;
      void pollQueue();
    }, 0);
  } catch (err) {
    console.error("Queue polling error:", err);
    isPolling = false;
  }
}

let pollingInterval: NodeJS.Timeout | null = null;

export const workflowJobQueue = {
  registerWorker(actionType: string, handler: (payload: any) => Promise<void>) {
    handlers.set(actionType, handler);
  },

  startWorker() {
    if (pollingInterval) return;
    void pollQueue();
    pollingInterval = setInterval(() => {
      void pollQueue();
    }, 5000);
  },

  async enqueue(input: { workflowRunId: string; label: string; actionType: string; actionPayload: Prisma.InputJsonValue }) {
    const job = await prisma.workflowJob.create({
      data: {
        workflowRunId: input.workflowRunId,
        label: input.label,
        actionType: input.actionType,
        actionPayload: input.actionPayload
      }
    });

    void pollQueue();
    return job;
  },

  async stats() {
    const pending = await prisma.workflowJob.count({ where: { status: "PENDING" } });
    const runningJobs = await prisma.workflowJob.findMany({ where: { status: "RUNNING" } });
    const completedJobs = await prisma.workflowJob.findMany({
      where: { status: "COMPLETED" },
      orderBy: { finishedAt: "desc" },
      take: 20
    });
    const failedJobs = await prisma.workflowJob.findMany({
      where: { status: "FAILED" },
      orderBy: { finishedAt: "desc" },
      take: 20
    });

    return {
      pending,
      pendingJobs: [], // omitted for brevity
      active: runningJobs.length > 0 ? runningJobs[0] : null,
      completed: completedJobs,
      failed: failedJobs
    };
  }
};
