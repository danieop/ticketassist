import { type Page, expect } from '@playwright/test';

const API_BASE = 'http://localhost:4000';

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  // Wait for redirect away from login page
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10_000 });
}

export async function apiLogin(email: string, password: string): Promise<{ accessToken: string; user: { id: string; role: string } }> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  return res.json();
}

export async function apiRegister(data: { name: string; email: string; password: string; role: string }) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return { status: res.status, body: await res.json() };
}

export function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function adminLogin(): Promise<string> {
  const login = await apiLogin('admin@test.com', 'password123');
  return login.accessToken;
}

export async function registerAndApprove(role: 'DEVELOPER' | 'MENTOR' = 'DEVELOPER'): Promise<{ token: string; userId: string; email: string }> {
  const ts = Date.now();
  const email = `test-${ts}@test.com`;

  const reg = await apiRegister({ name: `Test ${role}`, email, password: 'password123', role });
  if (reg.status !== 201) throw new Error(`Registration failed: ${reg.status}`);

  const regRequestId = reg.body.registrationRequest?.id;
  if (!regRequestId) throw new Error('No registration request ID in response');

  const adminToken = await adminLogin();
  const approveRes = await fetch(`${API_BASE}/api/users/registration-requests/${regRequestId}/approve`, {
    method: 'POST',
    headers: authHeaders(adminToken),
  });
  if (!approveRes.ok) throw new Error(`Approval failed: ${approveRes.status}`);

  const login = await apiLogin(email, 'password123');
  return { token: login.accessToken, userId: login.user.id, email };
}

async function authFetch(method: string, path: string, token: string, body?: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: authHeaders(token),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

export async function authPost(path: string, body: unknown, token: string) {
  return authFetch('POST', path, token, body);
}

export async function authPatch(path: string, body: unknown, token: string) {
  return authFetch('PATCH', path, token, body);
}

export async function authDelete(path: string, token: string) {
  return authFetch('DELETE', path, token);
}
