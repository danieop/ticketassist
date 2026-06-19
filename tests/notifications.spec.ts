import { test, expect } from '@playwright/test';
import { loginAs, apiLogin, authHeaders } from './helpers/auth';
import {
  getNotificationBadgeCount,
  openNotificationDropdown,
  closeNotificationDropdown,
} from './helpers/notifications';

const API = 'http://localhost:4000';

// These tests assume seeded users exist.
// Adjust credentials to match your seed data.
const DEV_EMAIL = 'dev@test.com';
const DEV_PASSWORD = 'password123';
const MENTOR_EMAIL = 'mentor@test.com';
const MENTOR_PASSWORD = 'password123';

test.describe('Notification Bell UI', () => {
  test('bell icon is visible after login', async ({ page }) => {
    await loginAs(page, DEV_EMAIL, DEV_PASSWORD);
    await expect(page.locator('.notification-bell-button')).toBeVisible();
  });

  test('bell shows empty state when no notifications', async ({ page }) => {
    await loginAs(page, DEV_EMAIL, DEV_PASSWORD);
    await openNotificationDropdown(page);
    await expect(page.locator('.notification-empty')).toBeVisible();
  });

  test('click outside closes dropdown', async ({ page }) => {
    await loginAs(page, DEV_EMAIL, DEV_PASSWORD);
    await openNotificationDropdown(page);
    await expect(page.locator('.notification-dropdown')).toBeVisible();
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('.notification-dropdown')).not.toBeVisible();
  });
});

test.describe('Notification API', () => {
  let devToken: string;

  test.beforeAll(async () => {
    const login = await apiLogin(DEV_EMAIL, DEV_PASSWORD);
    devToken = login.accessToken;
  });

  test('list notifications returns array', async () => {
    const res = await fetch(`${API}/api/notifications`, {
      headers: authHeaders(devToken),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('unread count returns count', async () => {
    const res = await fetch(`${API}/api/notifications/unread-count`, {
      headers: authHeaders(devToken),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.count).toBe('number');
  });

  test('mark all as read succeeds', async () => {
    const res = await fetch(`${API}/api/notifications/read-all`, {
      method: 'PATCH',
      headers: authHeaders(devToken),
    });
    expect(res.status).toBe(200);
  });

  test('unauthenticated request returns 401', async () => {
    const res = await fetch(`${API}/api/notifications`);
    expect(res.status).toBe(401);
  });

  test('SSE stream connects with token query param', async () => {
    const res = await fetch(`${API}/api/notifications/stream?token=${devToken}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    // Close connection
    if (res.body) {
      const reader = res.body.getReader();
      await reader.cancel();
    }
  });
});
