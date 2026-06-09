type WorkflowJob = {
  id: string;
  workflowRunId: string;
  label: string;
  createdAt: string;
  run: () => Promise<void>;
};

const pendingJobs: WorkflowJob[] = [];
const completedJobs: { id: string; workflowRunId: string; label: string; finishedAt: string }[] = [];
const failedJobs: { id: string; workflowRunId: string; label: string; error: string; finishedAt: string }[] = [];
let activeJob: WorkflowJob | null = null;

async function drainQueue() {
  if (activeJob || pendingJobs.length === 0) {
    return;
  }

  activeJob = pendingJobs.shift() ?? null;

  if (!activeJob) {
    return;
  }

  try {
    await activeJob.run();
    completedJobs.unshift({
      id: activeJob.id,
      workflowRunId: activeJob.workflowRunId,
      label: activeJob.label,
      finishedAt: new Date().toISOString()
    });
  } catch (error) {
    failedJobs.unshift({
      id: activeJob.id,
      workflowRunId: activeJob.workflowRunId,
      label: activeJob.label,
      error: error instanceof Error ? error.message : "Workflow job failed",
      finishedAt: new Date().toISOString()
    });
  } finally {
    completedJobs.splice(20);
    failedJobs.splice(20);
    activeJob = null;
    void drainQueue();
  }
}

export const workflowJobQueue = {
  enqueue(input: { workflowRunId: string; label: string; run: () => Promise<void> }) {
    const job: WorkflowJob = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      workflowRunId: input.workflowRunId,
      label: input.label,
      createdAt: new Date().toISOString(),
      run: input.run
    };

    pendingJobs.push(job);
    void drainQueue();

    return job;
  },

  stats() {
    return {
      pending: pendingJobs.length,
      pendingJobs: pendingJobs.map((job) => ({
        id: job.id,
        workflowRunId: job.workflowRunId,
        label: job.label,
        createdAt: job.createdAt
      })),
      active: activeJob
        ? {
            id: activeJob.id,
            workflowRunId: activeJob.workflowRunId,
            label: activeJob.label,
            createdAt: activeJob.createdAt
          }
        : null,
      completed: completedJobs,
      failed: failedJobs
    };
  }
};
