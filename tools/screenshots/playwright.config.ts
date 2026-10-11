import { defineConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import base from '../../playwright.config';

/**
 * Screenshots for the README and the mockups — not part of the E2E suite.
 *
 *   npx playwright test -c tools/screenshots
 *
 * Same preview build and isolated, freshly seeded backend as the E2E run;
 * the raw captures land in `tools/screenshots/out/`, then
 * `node tools/screenshots/compose.mjs` builds the mockups in `docs/media/`.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const servers = Array.isArray(base.webServer) ? base.webServer : [base.webServer!];

export default defineConfig({
  ...base,
  testDir: '.',
  testMatch: /shots\.spec\.ts$/,
  testIgnore: [],
  timeout: 240_000,
  retries: 0,
  reporter: 'list',
  // The frontend server has no cwd of its own: relative to this config it would
  // run in tools/screenshots.
  webServer: servers.map(s => ({ ...s, cwd: s.cwd ?? ROOT })),
});
