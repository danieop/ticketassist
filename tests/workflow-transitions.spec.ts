import { test, expect } from '@playwright/test';
import { apiLogin, authHeaders } from './helpers/auth';
import { get, post, patch, pollWorkflowStatus } from './helpers/api';

const DEV_EMAIL = 'dev@test.com';
const DEV_PASSWORD = 'password123';
const MENTOR_EMAIL = 'mentor@test.com';
const MENTOR_PASSWORD = 'password123';

const API = 'http://localhost:4000';

/**
 * The expected status sequence as each agent completes:
 *
 *   created
 *     → (TicketAnalyzer) → ticket_analyzed
 *     → (accept: PriorityClassifier + RepoSearch in parallel) → repo_searched
 *     → (accept: CodeContext) → code_context_ready
 *     → (accept: FixProposal) → fix_proposed
 *     → (accept: MentorDraft) → mentor_draft_ready
 *     → (submit) → waiting_for_review
 *     → (review APPROVED/REJECTED) → reviewed
 *     → (review NEED_MORE_INFORMATION) → mentor_draft_ready
 */

// ─── Full Pipeline ──────────────────────────────────────────────────────────────

test.describe('Workflow — Full Agent Pipeline', () => {
  test.describe.configure({ timeout: 180_000 });

  let devToken: string;
  let mentorToken: string;
  let workflowId: string;

  test.beforeAll(async () => {
    const dev = await apiLogin(DEV_EMAIL, DEV_PASSWORD);
    devToken = dev.accessToken;

    const mentor = await apiLogin(MENTOR_EMAIL, MENTOR_PASSWORD);
    mentorToken = mentor.accessToken;
  });

  test('Step 1: create workflow → status is created', async () => {
    const { status, body } = await post('/api/workflows', {
      ticket: {
        title: `Full Pipeline Test ${Date.now()}`,
        description: 'Testing the complete 6-agent pipeline with exact status assertions',
        reporterName: 'Integration Test',
        source: 'MANUAL',
      },
    }, devToken);
    expect(status).toBe(201);
    expect((body as any).status).toBe('created');
    workflowId = (body as any).id;
  });

  test('Step 2: first agent (TicketAnalyzer) processes → ticket_analyzed', async () => {
    const data = await pollWorkflowStatus(workflowId, 'ticket_analyzed', devToken, 60_000);
    expect((data as any).status).toBe('ticket_analyzed');
  });

  test('Step 3: accept → PriorityClassifier + RepoSearch run → repo_searched', async () => {
    const { status } = await post(`/api/workflows/${workflowId}/accept`, {}, devToken);
    expect(status).toBe(200);

    const data = await pollWorkflowStatus(workflowId, 'repo_searched', devToken, 60_000);
    expect((data as any).status).toBe('repo_searched');
  });

  test('Step 4: accept → CodeContext runs → code_context_ready', async () => {
    const { status } = await post(`/api/workflows/${workflowId}/accept`, {}, devToken);
    expect(status).toBe(200);

    const data = await pollWorkflowStatus(workflowId, 'code_context_ready', devToken, 60_000);
    expect((data as any).status).toBe('code_context_ready');
  });

  test('Step 5: accept → FixProposal runs → fix_proposed', async () => {
    const { status } = await post(`/api/workflows/${workflowId}/accept`, {}, devToken);
    expect(status).toBe(200);

    const data = await pollWorkflowStatus(workflowId, 'fix_proposed', devToken, 60_000);
    expect((data as any).status).toBe('fix_proposed');
  });

  test('Step 6: accept → MentorDraft runs → mentor_draft_ready', async () => {
    const { status } = await post(`/api/workflows/${workflowId}/accept`, {}, devToken);
    expect(status).toBe(200);

    const data = await pollWorkflowStatus(workflowId, 'mentor_draft_ready', devToken, 60_000);
    expect((data as any).status).toBe('mentor_draft_ready');
  });

  test('Step 7: submit for review → waiting_for_review', async () => {
    const { status, body } = await post(`/api/workflows/${workflowId}/submit`, {}, devToken);
    expect(status).toBe(200);
    expect((body as any).status).toBe('waiting_for_review');
  });

  test('Step 8: mentor approves → reviewed', async () => {
    const { status, body } = await post(`/api/workflows/${workflowId}/review`, {
      decision: 'APPROVED',
      comment: 'Pipeline looks solid, approved.',
    }, mentorToken);
    expect(status).toBe(200);
    expect((body as any).status).toBe('reviewed');
  });
});

// ─── Submit Guard ───────────────────────────────────────────────────────────────

test.describe('Workflow — Submit Guards', () => {
  test.setTimeout(60_000);

  let devToken: string;

  test.beforeAll(async () => {
    const dev = await apiLogin(DEV_EMAIL, DEV_PASSWORD);
    devToken = dev.accessToken;
  });

  test('cannot submit for review before mentor_draft_ready', async () => {
    // Create a fresh workflow (status = created, first agent auto-enqueued)
    const { body } = await post('/api/workflows', {
      ticket: {
        title: `Submit Guard Test ${Date.now()}`,
        description: 'This workflow should not be submittable yet',
        reporterName: 'Test',
        source: 'MANUAL',
      },
    }, devToken);

    const { status, body: errBody } = await post(`/api/workflows/${(body as any).id}/submit`, {}, devToken);
    expect(status).toBe(400);
    expect((errBody as any).message).toContain('not ready for review');
  });
});

// ─── Review Decisions ───────────────────────────────────────────────────────────

test.describe('Workflow — Review Decisions (on submitted workflows)', () => {
  test.describe.configure({ timeout: 360_000 });

  let devToken: string;
  let mentorToken: string;

  test.beforeAll(async () => {
    const dev = await apiLogin(DEV_EMAIL, DEV_PASSWORD);
    devToken = dev.accessToken;

    const mentor = await apiLogin(MENTOR_EMAIL, MENTOR_PASSWORD);
    mentorToken = mentor.accessToken;
  });

  /**
   * Helper: creates a workflow, walks it through all 6 agents, submits for
   * review, and returns the workflow ID in waiting_for_review status.
   */
  async function createSubmittedWorkflow(label: string): Promise<string> {
    const { body } = await post('/api/workflows', {
      ticket: {
        title: `${label} ${Date.now()}`,
        description: 'Automated pipeline for review decision testing',
        reporterName: 'Test',
        source: 'MANUAL',
      },
    }, devToken);
    const wfId = (body as any).id;

    // Walk through all 6 agents: ticket_analyzed → repo_searched → code_context_ready → fix_proposed → mentor_draft_ready
    await pollWorkflowStatus(wfId, 'ticket_analyzed', devToken, 60_000);

    await post(`/api/workflows/${wfId}/accept`, {}, devToken);
    await pollWorkflowStatus(wfId, 'repo_searched', devToken, 60_000);

    await post(`/api/workflows/${wfId}/accept`, {}, devToken);
    await pollWorkflowStatus(wfId, 'code_context_ready', devToken, 60_000);

    await post(`/api/workflows/${wfId}/accept`, {}, devToken);
    await pollWorkflowStatus(wfId, 'fix_proposed', devToken, 60_000);

    await post(`/api/workflows/${wfId}/accept`, {}, devToken);
    await pollWorkflowStatus(wfId, 'mentor_draft_ready', devToken, 60_000);

    const { status } = await post(`/api/workflows/${wfId}/submit`, {}, devToken);
    expect(status).toBe(200);

    return wfId;
  }

  test('REJECTED → reviewed', async () => {
    const wfId = await createSubmittedWorkflow('Reject Test');

    const { status, body } = await post(`/api/workflows/${wfId}/review`, {
      decision: 'REJECTED',
      comment: 'Approach is incorrect, rejecting.',
    }, mentorToken);
    expect(status).toBe(200);
    expect((body as any).status).toBe('reviewed');
    expect((body as any).mentorReview.decision).toBe('REJECTED');
  });

  test('NEED_MORE_INFORMATION → mentor_draft_ready (loops back)', async () => {
    const wfId = await createSubmittedWorkflow('NeedInfo Test');

    const { status, body } = await post(`/api/workflows/${wfId}/review`, {
      decision: 'NEED_MORE_INFORMATION',
      comment: 'Please elaborate on the risk assessment.',
    }, mentorToken);
    expect(status).toBe(200);
    expect((body as any).status).toBe('mentor_draft_ready');
  });
});

// ─── Edit & Rerun ───────────────────────────────────────────────────────────────

test.describe('Workflow — Edit Output & Rerun', () => {
  test.describe.configure({ timeout: 240_000 });

  let devToken: string;

  test.beforeAll(async () => {
    const dev = await apiLogin(DEV_EMAIL, DEV_PASSWORD);
    devToken = dev.accessToken;
  });

  test('edit TICKET_ANALYZER output → updates output and clears downstream', async () => {
    const { body } = await post('/api/workflows', {
      ticket: {
        title: `Edit Test ${Date.now()}`,
        description: 'Testing developer edit of agent output',
        reporterName: 'Test',
        source: 'MANUAL',
      },
    }, devToken);
    const wfId = (body as any).id;

    // Wait for first agent to complete
    await pollWorkflowStatus(wfId, 'ticket_analyzed', devToken, 60_000);

    // Edit the ticket analyzer output
    const { status, body: editBody } = await patch(`/api/workflows/${wfId}/output`, {
      agentType: 'TICKET_ANALYZER',
      output: {
        summary: 'Edited: User reports login page crashes on Safari 17',
        keyFacts: ['Safari 17 specific', 'Login page affected', 'Crash on form submit'],
        affectedFeature: 'authentication',
        suspectedFlow: 'login form → submit handler → session creation',
        missingInfo: ['Browser console errors', 'Exact Safari version'],
      },
      note: 'Refined the analysis with more specific details',
    }, devToken);
    expect(status).toBe(200);
    // After editing TICKET_ANALYZER, status should revert to ticket_analyzed
    // (the edited agent's completed status)
    expect((editBody as any).status).toBe('ticket_analyzed');
  });

  test('rerun TICKET_ANALYZER → re-processes from scratch', async () => {
    const { body } = await post('/api/workflows', {
      ticket: {
        title: `Rerun Test ${Date.now()}`,
        description: 'Testing agent rerun clears and re-executes',
        reporterName: 'Test',
        source: 'MANUAL',
      },
    }, devToken);
    const wfId = (body as any).id;

    // Wait for first agent to complete
    await pollWorkflowStatus(wfId, 'ticket_analyzed', devToken, 60_000);

    // Rerun the ticket analyzer
    const { status } = await post(`/api/workflows/${wfId}/rerun`, {
      agentType: 'TICKET_ANALYZER',
      runAsync: false,
    }, devToken);
    expect(status).toBe(200);

    // After rerun enqueue, poll for it to complete again
    const data = await pollWorkflowStatus(wfId, 'ticket_analyzed', devToken, 60_000);
    expect((data as any).status).toBe('ticket_analyzed');
  });

  test('cannot accept when status is mentor_draft_ready', async () => {
    const { body } = await post('/api/workflows', {
      ticket: {
        title: `Accept Guard Test ${Date.now()}`,
        description: 'Testing accept guard at terminal agent state',
        reporterName: 'Test',
        source: 'MANUAL',
      },
    }, devToken);
    const wfId = (body as any).id;

    // Walk to mentor_draft_ready
    await pollWorkflowStatus(wfId, 'ticket_analyzed', devToken, 60_000);
    await post(`/api/workflows/${wfId}/accept`, {}, devToken);
    await pollWorkflowStatus(wfId, 'repo_searched', devToken, 60_000);
    await post(`/api/workflows/${wfId}/accept`, {}, devToken);
    await pollWorkflowStatus(wfId, 'code_context_ready', devToken, 60_000);
    await post(`/api/workflows/${wfId}/accept`, {}, devToken);
    await pollWorkflowStatus(wfId, 'fix_proposed', devToken, 60_000);
    await post(`/api/workflows/${wfId}/accept`, {}, devToken);
    await pollWorkflowStatus(wfId, 'mentor_draft_ready', devToken, 60_000);

    // Accept should fail — all agents are done
    const { status, body: errBody } = await post(`/api/workflows/${wfId}/accept`, {}, devToken);
    expect(status).toBe(400);
    expect((errBody as any).message).toContain('Submit the mentor draft');
  });
});
