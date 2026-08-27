import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB_PATH = path.resolve(__dirname, 'server', 'data', 'e2e-test.db');
const FRONTEND_PORT = 4173;
const BACKEND_PORT = 3001;

/**
 * Playwright config — frontend E2E against the production preview build
 * with a real (isolated) backend on :3001 seeded by global-setup.
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  // Exclude helper modules from being treated as tests
  testIgnore: ['**/fixtures.ts', '**/global-setup.ts'],
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

  webServer: [
    {
      // Frontend preview.
      //
      // ⚠️ The build belongs HERE, not in `globalSetup`: Playwright starts
      // `webServer` *before* the setup hook, so in a clean checkout `vite
      // preview` came up with no `dist/` to serve and the URL probe timed out
      // after 60s. It only ever looked healthy locally because a stale `dist/`
      // happened to be present.
      //
      // VITE_API_URL must point at the E2E backend — the checked-in `.env`
      // points at production, which would send test browsers at the live API.
      command: `VITE_API_URL=http://localhost:${BACKEND_PORT} npm run build && npm run preview`,
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: !process.env.CI,
      // Generous: this now includes a full production build (~70s and growing).
      timeout: 240_000,
    },
    {
      // Isolated backend pointing at the test DB seeded in globalSetup
      command: 'node dist/index.js',
      cwd: path.resolve(__dirname, 'server'),
      url: `http://localhost:${BACKEND_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        NODE_ENV: 'test',
        PORT: String(BACKEND_PORT),
        DATABASE_PATH: TEST_DB_PATH,
        JWT_SECRET: 'e2e-test-jwt-secret',
        SESSION_SECRET: 'e2e-test-session-secret',
        CORS_ORIGINS: `http://localhost:${FRONTEND_PORT},http://localhost:5173,http://localhost:3000`,
        APP_URL: `http://localhost:${FRONTEND_PORT}`,
        // Dummy values so passport-google-oauth20 doesn't crash at import.
        // No OAuth flow is exercised in tests; password login only.
        GOOGLE_CLIENT_ID: 'e2e-dummy-client-id',
        GOOGLE_CLIENT_SECRET: 'e2e-dummy-secret',
      },
    },
  ],
});
