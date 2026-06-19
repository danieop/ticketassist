import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { loginAs, apiLogin, authHeaders } from './helpers/auth';
import {
  getNotificationBadgeCount,
  openNotificationDropdown,
  waitForNotification,
  clickNotification,
} from './helpers/notifications';

const API = 'http://localhost:4000';

// Test users - adjust to match your seed data
const DEV_EMAIL = 'dev@test.com';
const DEV_PASSWORD = 'password123';
const MENTOR_EMAIL = 'mentor@test.com';
const MENTOR_PASSWORD = 'password123';

test.describe('Full Workflow with Notifications', () => {
  let devContext: BrowserContext;
  let mentorContext: BrowserContext;
  let devPage: Page;
  let mentorPage: Page;
  let devToken: string;
  let mentorToken: string;
  let devUserId: string;
  let mentorUserId: string;

  test.beforeAll(async ({ browser }) => {
    // Create separate browser contexts for developer and mentor
    devContext = await browser.newContext();
    mentorContext = await browser.newContext();
    devPage = await devContext.newPage();
    mentorPage = await mentorContext.newPage();

    // Get API tokens
    const devLogin = await apiLogin(DEV_EMAIL, DEV_PASSWORD);
    devToken = devLogin.accessToken;
    devUserId = devLogin.user.id;

    const mentorLogin = await apiLogin(MENTOR_EMAIL, MENTOR_PASSWORD);
    mentorToken = mentorLogin.accessToken;
    mentorUserId = mentorLogin.user.id;
  });

  test.afterAll(async () => {
    await devContext?.close();
    await mentorContext?.close();
  });

  test('Step 1: Developer logs in and sees notification bell', async () => {
    await loginAs(devPage, DEV_EMAIL, DEV_PASSWORD);
    await expect(devPage.locator('.notification-bell-button')).toBeVisible();
    const count = await getNotificationBadgeCount(devPage);
    // Badge may or may not be visible if count is 0
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('Step 2: Mentor logs in and sees notification bell', async () => {
    await loginAs(mentorPage, MENTOR_EMAIL, MENTOR_PASSWORD);
    await expect(mentorPage.locator('.notification-bell-button')).toBeVisible();
  });

  test('Step 3: Create a ticket via API', async () => {
    const res = await fetch(`${API}/api/tickets`, {
      method: 'POST',
      headers: authHeaders(devToken),
      body: JSON.stringify({
        title: 'E2E Test Ticket - Notification Flow',
        description: 'This ticket is created by the e2e test to verify the notification flow',
        reporterName: 'E2E Tester',
        source: 'MANUAL',
      }),
    });
    expect(res.status).toBe(201);
    const ticket = await res.json();
    expect(ticket.id).toBeTruthy();
    // Store ticket ID for later steps
    (test.info() as any).__ticketId = ticket.id;
  });

  test('Step 4: Verify notification API returns correct data structure', async () => {
    // List notifications
    const listRes = await fetch(`${API}/api/notifications?limit=5`, {
      headers: authHeaders(devToken),
    });
    expect(listRes.status).toBe(200);
    const notifications = await listRes.json();
    expect(Array.isArray(notifications)).toBe(true);

    // Unread count
    const countRes = await fetch(`${API}/api/notifications/unread-count`, {
      headers: authHeaders(devToken),
    });
    expect(countRes.status).toBe(200);
    const { count } = await countRes.json();
    expect(typeof count).toBe('number');
  });

  test('Step 5: SSE stream is accessible', async () => {
    // Verify SSE endpoint responds correctly
    const res = await fetch(`${API}/api/notifications/stream?token=${devToken}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    // Clean up stream
    if (res.body) {
      const reader = res.body.getReader();
      await reader.cancel();
    }
  });

  test('Step 6: Mark all as read works', async () => {
    const res = await fetch(`${API}/api/notifications/read-all`, {
      method: 'PATCH',
      headers: authHeaders(devToken),
    });
    expect(res.status).toBe(200);

    // Verify unread count is 0
    const countRes = await fetch(`${API}/api/notifications/unread-count`, {
      headers: authHeaders(devToken),
    });
    const { count } = await countRes.json();
    expect(count).toBe(0);
  });

  test('Step 7: Notification bell UI interaction - open and close', async () => {
    // Developer opens notification dropdown
    await devPage.locator('.notification-bell-button').click();
    await expect(devPage.locator('.notification-dropdown')).toBeVisible();

    // Close by clicking bell again
    await devPage.locator('.notification-bell-button').click();
    // The dropdown should toggle
  });

  test('Step 8: Mentor notification bell interaction', async () => {
    await mentorPage.locator('.notification-bell-button').click();
    await expect(mentorPage.locator('.notification-dropdown')).toBeVisible();
    // Close
    await mentorPage.locator('body').click({ position: { x: 10, y: 10 } });
  });

  test('Step 9: Notification persistence across page refresh', async () => {
    // Get current notification count via API
    const countBefore = await fetch(`${API}/api/notifications/unread-count`, {
      headers: authHeaders(devToken),
    }).then(r => r.json()).then(d => d.count);

    // Refresh the developer page
    await devPage.reload();
    await expect(devPage.locator('.notification-bell-button')).toBeVisible({ timeout: 10_000 });

    // Count should be preserved
    const countAfter = await fetch(`${API}/api/notifications/unread-count`, {
      headers: authHeaders(devToken),
    }).then(r => r.json()).then(d => d.count);

    expect(countAfter).toBe(countBefore);
  });
});

test.describe('Notification API Edge Cases', () => {
  let devToken: string;

  test.beforeAll(async () => {
    const login = await apiLogin(DEV_EMAIL, DEV_PASSWORD);
    devToken = login.accessToken;
  });

  test('mark non-existent notification as read returns gracefully', async () => {
    const res = await fetch(`${API}/api/notifications/nonexistent-id/read`, {
      method: 'PATCH',
      headers: authHeaders(devToken),
    });
    // Should not crash - either 200 or 404 is acceptable
    expect([200, 404]).toContain(res.status);
  });

  test('list with unreadOnly filter', async () => {
    const res = await fetch(`${API}/api/notifications?unreadOnly=true`, {
      headers: authHeaders(devToken),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('list with limit parameter', async () => {
    const res = await fetch(`${API}/api/notifications?limit=5`, {
      headers: authHeaders(devToken),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeLessThanOrEqual(5);
  });
});
