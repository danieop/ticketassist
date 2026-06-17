# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-workflow-notifications.spec.ts >> Full Workflow with Notifications >> Step 1: Developer logs in and sees notification bell
- Location: tests\full-workflow-notifications.spec.ts:50:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - region "Welcome back" [ref=e3]:
      - generic [ref=e4]:
        - paragraph [ref=e5]: TicketAssist
        - heading "Welcome back" [level=1] [ref=e6]
        - paragraph [ref=e7]: Login to continue triaging tickets with your team.
      - generic [ref=e8]:
        - generic [ref=e9]:
          - text: Email
          - textbox "Email" [ref=e10]: dev@test.com
        - generic [ref=e11]:
          - text: Password
          - textbox "Password" [ref=e12]: password123
        - button "Please wait..." [disabled] [ref=e13]: Please wait...
      - paragraph [ref=e17]: or
      - paragraph [ref=e19]: Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google login.
      - paragraph [ref=e20]:
        - text: Need an account?
        - link "Register" [ref=e21] [cursor=pointer]:
          - /url: /register
  - button "Open Next.js Dev Tools" [ref=e27] [cursor=pointer]:
    - img [ref=e28]
  - alert [ref=e31]
```

# Test source

```ts
  1  | import { type Page, expect } from '@playwright/test';
  2  | 
  3  | const API_BASE = 'http://localhost:4000';
  4  | 
  5  | export async function loginAs(page: Page, email: string, password: string) {
  6  |   await page.goto('/login');
  7  |   await page.getByLabel(/email/i).fill(email);
  8  |   await page.getByLabel(/password/i).fill(password);
  9  |   await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  10 |   // Wait for redirect away from login page
> 11 |   await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10_000 });
     |              ^ TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
  12 | }
  13 | 
  14 | export async function apiLogin(email: string, password: string): Promise<{ accessToken: string; user: { id: string; role: string } }> {
  15 |   const res = await fetch(`${API_BASE}/api/auth/login`, {
  16 |     method: 'POST',
  17 |     headers: { 'Content-Type': 'application/json' },
  18 |     body: JSON.stringify({ email, password }),
  19 |   });
  20 |   if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  21 |   return res.json();
  22 | }
  23 | 
  24 | export async function apiRegister(data: { name: string; email: string; password: string; role: string }) {
  25 |   const res = await fetch(`${API_BASE}/api/auth/register`, {
  26 |     method: 'POST',
  27 |     headers: { 'Content-Type': 'application/json' },
  28 |     body: JSON.stringify(data),
  29 |   });
  30 |   return { status: res.status, body: await res.json() };
  31 | }
  32 | 
  33 | export function authHeaders(token: string) {
  34 |   return {
  35 |     'Content-Type': 'application/json',
  36 |     Authorization: `Bearer ${token}`,
  37 |   };
  38 | }
  39 | 
```