import { test, expect } from '@playwright/test';
import { apiLogin, apiRegister, registerAndApprove, authHeaders, adminLogin } from './helpers/auth';

const API = 'http://localhost:4000';

test.describe('Auth — Registration', () => {
  test('register with valid data returns 201 and PENDING_APPROVAL', async () => {
    const ts = Date.now();
    const { status, body } = await apiRegister({
      name: 'New Dev',
      email: `reg-test-${ts}@test.com`,
      password: 'password123',
      role: 'DEVELOPER',
    });
    expect(status).toBe(201);
    expect(body.status).toBe('PENDING_APPROVAL');
    expect(body.registrationRequest).toBeTruthy();
    expect(body.registrationRequest.id).toBeTruthy();
  });

  test('register with duplicate email returns 409', async () => {
    const ts = Date.now();
    const email = `dup-${ts}@test.com`;
    await apiRegister({ name: 'First', email, password: 'password123', role: 'DEVELOPER' });

    // Approve the registration to create a real user, then duplicate registration should fail
    const adminToken = await adminLogin();
    const requestsRes = await fetch(`${API}/api/users/registration-requests`, {
      headers: authHeaders(adminToken),
    });
    const requests = await requestsRes.json();
    const pendingReq = requests.find((r: any) => r.email === email);
    await fetch(`${API}/api/users/registration-requests/${pendingReq.id}/approve`, {
      method: 'POST',
      headers: authHeaders(adminToken),
    });

    const { status } = await apiRegister({ name: 'Second', email, password: 'password123', role: 'MENTOR' });
    expect(status).toBe(409);
  });

  test('register with short password (<8 chars) returns 400', async () => {
    const ts = Date.now();
    const { status, body } = await apiRegister({
      name: 'Short Pw',
      email: `shortpw-${ts}@test.com`,
      password: '1234567',
      role: 'DEVELOPER',
    });
    expect(status).toBe(400);
  });

  test('register with missing name returns 400', async () => {
    const ts = Date.now();
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `noname-${ts}@test.com`, password: 'password123', role: 'DEVELOPER' }),
    });
    expect(res.status).toBe(400);
  });

  test('register with role=ADMIN returns 400', async () => {
    const ts = Date.now();
    const { status } = await apiRegister({
      name: 'Admin Wannabe',
      email: `admin-reg-${ts}@test.com`,
      password: 'password123',
      role: 'ADMIN',
    });
    expect(status).toBe(400);
  });
});

test.describe('Auth — Login', () => {
  test('login as PENDING user returns 403', async () => {
    const ts = Date.now();
    const email = `pending-${ts}@test.com`;
    await apiRegister({ name: 'Pending User', email, password: 'password123', role: 'DEVELOPER' });

    const loginRes = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123' }),
    });
    expect(loginRes.status).toBe(403);
    const body = await loginRes.json();
    expect(body.message).toContain('waiting for admin approval');
  });

  test('login after admin approves registration returns 200 with tokens', async () => {
    const result = await registerAndApprove('DEVELOPER');
    expect(result.token).toBeTruthy();
    expect(result.userId).toBeTruthy();
  });

  test('login with wrong password returns 401', async () => {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dev@test.com', password: 'wrongpassword' }),
    });
    expect(res.status).toBe(401);
  });

  test('login with non-existent email returns 401', async () => {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'noone@test.com', password: 'password123' }),
    });
    expect(res.status).toBe(401);
  });
});

test.describe('Auth — Token & Guards', () => {
  test('access protected route without token returns 401', async () => {
    const res = await fetch(`${API}/api/auth/me`);
    expect(res.status).toBe(401);
  });

  test('access protected route with garbage token returns 401', async () => {
    const res = await fetch(`${API}/api/auth/me`, {
      headers: authHeaders('garbage-token-value'),
    });
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me returns current user', async () => {
    const login = await apiLogin('dev@test.com', 'password123');
    const res = await fetch(`${API}/api/auth/me`, {
      headers: authHeaders(login.accessToken),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.email).toBe('dev@test.com');
  });

  test('token refresh returns new token pair', async () => {
    const login = await apiLogin('dev@test.com', 'password123');
    const res = await fetch(`${API}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: (login as any).refreshToken }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    expect(body.accessToken).not.toBe(login.accessToken);
  });

  test('logout revokes refresh token', async () => {
    const login = await apiLogin('dev@test.com', 'password123') as any;
    const logoutRes = await fetch(`${API}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: login.refreshToken }),
    });
    expect(logoutRes.status).toBe(200);

    // Trying to use the revoked refresh token should fail
    const refreshRes = await fetch(`${API}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: login.refreshToken }),
    });
    expect(refreshRes.status).toBe(401);
  });
});
