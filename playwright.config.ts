import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: [
    {
      command: 'npm run dev -w @ticketassist/backend',
      port: 4000,
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'npm run dev -w @ticketassist/frontend',
      port: 3000,
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
