import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — frontend E2E against the production preview build.
 * Backend is not started by these tests; flows that need /api/* should
 * route-mock or run against a dedicated test backend.
 */
export default defineConfig({
  testDir: './e2e',
  // Tests share a single `vite preview` server. Parallel workers occasionally
  // race against each other for the in-flight asset requests, producing flaky
  // network-assertions. Suite is small, serial costs ~1s.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // The PWA service worker intercepts requests and skews network assertions
    // (cached responses don't fire request events). Block SWs in tests.
    serviceWorkers: 'block',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
