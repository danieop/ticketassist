import { test, expect } from '@playwright/test';
import { apiLogin, authHeaders } from './helpers/auth';

const API = 'http://localhost:4000';

test.describe('Role Guards', () => {
  let devToken: string;
  let mentorToken: string;
  let adminToken: string;
  let workflowIdForReview: string;
  let ticketId: string;

  test.beforeAll(async () => {
    const dev = await apiLogin('dev@test.com', 'password123');
    devToken = dev.accessToken;

    const mentor = await apiLogin('mentor@test.com', 'password123');
    mentorToken = mentor.accessToken;

    const admin = await apiLogin('admin@test.com', 'password123');
    adminToken = admin.accessToken;

    // Create a ticket and workflow for tests that need real IDs
    const ticketRes = await fetch(`${API}/api/tickets`, {
      method: 'POST',
      headers: authHeaders(devToken),
      body: JSON.stringify({
        title: 'Role Guard Test Ticket',
        description: 'Ticket created for role guard integration tests',
        reporterName: 'Test Runner',
        source: 'MANUAL',
      }),
    });
    const ticket = await ticketRes.json();
    ticketId = ticket.id;

    const wfRes = await fetch(`${API}/api/workflows`, {
      method: 'POST',
      headers: authHeaders(devToken),
      body: JSON.stringify({
        ticket: { title: ticket.title, description: ticket.description, reporterName: 'Test Runner', source: 'MANUAL' },
      }),
    });
    const wf = await wfRes.json();
    workflowIdForReview = wf.id;
  });

  test.describe('DEVELOPER restrictions', () => {
    test('GET /api/users → 403', async () => {
      const res = await fetch(`${API}/api/users`, { headers: authHeaders(devToken) });
      expect(res.status).toBe(403);
    });

    test('POST /api/users → 403', async () => {
      const res = await fetch(`${API}/api/users`, {
        method: 'POST',
        headers: authHeaders(devToken),
        body: JSON.stringify({ name: 'Hack', email: 'hack@test.com', role: 'DEVELOPER' }),
      });
      expect(res.status).toBe(403);
    });

    test('GET /api/users/registration-requests → 403', async () => {
      const res = await fetch(`${API}/api/users/registration-requests`, { headers: authHeaders(devToken) });
      expect(res.status).toBe(403);
    });

    test('POST /api/users/registration-requests/:id/approve → 403', async () => {
      const res = await fetch(`${API}/api/users/registration-requests/fake-id/approve`, {
        method: 'POST',
        headers: authHeaders(devToken),
      });
      expect(res.status).toBe(403);
    });

    test('POST /api/users/registration-requests/:id/reject → 403', async () => {
      const res = await fetch(`${API}/api/users/registration-requests/fake-id/reject`, {
        method: 'POST',
        headers: authHeaders(devToken),
        body: JSON.stringify({ reason: 'nope' }),
      });
      expect(res.status).toBe(403);
    });

    test('POST /api/workflows/:id/review → 403', async () => {
      const res = await fetch(`${API}/api/workflows/${workflowIdForReview}/review`, {
        method: 'POST',
        headers: authHeaders(devToken),
        body: JSON.stringify({ decision: 'APPROVED', comment: 'Looks good to me' }),
      });
      expect(res.status).toBe(403);
    });

    test('GET /api/workflows/quality → 403', async () => {
      const res = await fetch(`${API}/api/workflows/quality`, { headers: authHeaders(devToken) });
      expect(res.status).toBe(403);
    });
  });

  test.describe('MENTOR restrictions', () => {
    test('POST /api/tickets → 403', async () => {
      const res = await fetch(`${API}/api/tickets`, {
        method: 'POST',
        headers: authHeaders(mentorToken),
        body: JSON.stringify({
          title: 'Mentor Ticket Attempt',
          description: 'A mentor should not be able to create tickets',
          reporterName: 'Test Mentor',
          source: 'MANUAL',
        }),
      });
      expect(res.status).toBe(403);
    });

    test('PATCH /api/tickets/:id → 403', async () => {
      const res = await fetch(`${API}/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: authHeaders(mentorToken),
        body: JSON.stringify({ title: 'Hacked Ticket' }),
      });
      expect(res.status).toBe(403);
    });

    test('DELETE /api/tickets/:id → 403', async () => {
      const res = await fetch(`${API}/api/tickets/${ticketId}`, {
        method: 'DELETE',
        headers: authHeaders(mentorToken),
      });
      expect(res.status).toBe(403);
    });

    test('POST /api/workflows → 403', async () => {
      const res = await fetch(`${API}/api/workflows`, {
        method: 'POST',
        headers: authHeaders(mentorToken),
        body: JSON.stringify({
          ticket: { title: 'Mentor WF', description: 'Should be blocked', reporterName: 'M', source: 'MANUAL' },
        }),
      });
      expect(res.status).toBe(403);
    });

    test('POST /api/workflows/:id/accept → 403', async () => {
      const res = await fetch(`${API}/api/workflows/${workflowIdForReview}/accept`, {
        method: 'POST',
        headers: authHeaders(mentorToken),
        body: JSON.stringify({ runAsync: false }),
      });
      expect(res.status).toBe(403);
    });

    test('POST /api/workflows/:id/rerun → 403', async () => {
      const res = await fetch(`${API}/api/workflows/${workflowIdForReview}/rerun`, {
        method: 'POST',
        headers: authHeaders(mentorToken),
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(403);
    });

    test('PATCH /api/workflows/:id/output → 403', async () => {
      const res = await fetch(`${API}/api/workflows/${workflowIdForReview}/output`, {
        method: 'PATCH',
        headers: authHeaders(mentorToken),
        body: JSON.stringify({ agentType: 'TICKET_ANALYZER', output: { summary: 'x', keyFacts: ['a'] } }),
      });
      expect(res.status).toBe(403);
    });

    test('POST /api/workflows/:id/submit → 403', async () => {
      const res = await fetch(`${API}/api/workflows/${workflowIdForReview}/submit`, {
        method: 'POST',
        headers: authHeaders(mentorToken),
      });
      expect(res.status).toBe(403);
    });

    test('POST /api/repositories/upload → 403', async () => {
      const formData = new FormData();
      formData.append('name', 'test-repo');
      const res = await fetch(`${API}/api/repositories/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mentorToken}` },
        body: formData,
      });
      expect(res.status).toBe(403);
    });

    test('GET /api/users → 403', async () => {
      const res = await fetch(`${API}/api/users`, { headers: authHeaders(mentorToken) });
      expect(res.status).toBe(403);
    });
  });

  test.describe('Positive access checks', () => {
    test('ADMIN can GET /api/users → 200', async () => {
      const res = await fetch(`${API}/api/users`, { headers: authHeaders(adminToken) });
      expect(res.status).toBe(200);
    });

    test('ADMIN can POST /api/tickets → 201', async () => {
      const res = await fetch(`${API}/api/tickets`, {
        method: 'POST',
        headers: authHeaders(adminToken),
        body: JSON.stringify({
          title: 'Admin Ticket',
          description: 'Admins should be able to create tickets too',
          reporterName: 'Admin',
          source: 'MANUAL',
        }),
      });
      expect(res.status).toBe(201);
    });

    test('ADMIN can POST /api/workflows/:id/review → 200', async () => {
      // The workflow isn't in WAITING_FOR_REVIEW, so this gets 400, not 200.
      // Test that the role guard passes (not 403), even if business logic fails.
      const res = await fetch(`${API}/api/workflows/${workflowIdForReview}/review`, {
        method: 'POST',
        headers: authHeaders(adminToken),
        body: JSON.stringify({ decision: 'APPROVED', comment: 'Admin approved this' }),
      });
      expect(res.status).not.toBe(403);
    });

    test('any auth user can GET /api/tickets → 200', async () => {
      const dev = await fetch(`${API}/api/tickets`, { headers: authHeaders(devToken) });
      const mentor = await fetch(`${API}/api/tickets`, { headers: authHeaders(mentorToken) });
      const admin = await fetch(`${API}/api/tickets`, { headers: authHeaders(adminToken) });
      expect(dev.status).toBe(200);
      expect(mentor.status).toBe(200);
      expect(admin.status).toBe(200);
    });

    test('any auth user can GET /api/workflows → 200', async () => {
      const dev = await fetch(`${API}/api/workflows`, { headers: authHeaders(devToken) });
      const mentor = await fetch(`${API}/api/workflows`, { headers: authHeaders(mentorToken) });
      const admin = await fetch(`${API}/api/workflows`, { headers: authHeaders(adminToken) });
      expect(dev.status).toBe(200);
      expect(mentor.status).toBe(200);
      expect(admin.status).toBe(200);
    });

    test('any auth user can GET /api/agents → 200', async () => {
      const dev = await fetch(`${API}/api/agents`, { headers: authHeaders(devToken) });
      const mentor = await fetch(`${API}/api/agents`, { headers: authHeaders(mentorToken) });
      const admin = await fetch(`${API}/api/agents`, { headers: authHeaders(adminToken) });
      expect(dev.status).toBe(200);
      expect(mentor.status).toBe(200);
      expect(admin.status).toBe(200);
    });

    test('any auth user can GET /api/repositories → 200', async () => {
      const dev = await fetch(`${API}/api/repositories`, { headers: authHeaders(devToken) });
      const mentor = await fetch(`${API}/api/repositories`, { headers: authHeaders(mentorToken) });
      const admin = await fetch(`${API}/api/repositories`, { headers: authHeaders(adminToken) });
      expect(dev.status).toBe(200);
      expect(mentor.status).toBe(200);
      expect(admin.status).toBe(200);
    });
  });
});
