import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { TEST_USER, PATHS, BACKEND_PORT } from './fixtures';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/**
 * Playwright globalSetup: wipe and seed the isolated E2E SQLite database.
 *
 * ⚠️ The frontend build used to happen here, but Playwright starts `webServer`
 * BEFORE globalSetup — so `vite preview` came up with no `dist/` to serve and
 * timed out in any clean checkout (i.e. every CI run). The build now lives in
 * the `webServer` command in `playwright.config.ts`, where the ordering is
 * guaranteed.
 */
export default async function globalSetup() {
  execFileSync(
    'npx',
    ['ts-node', '--transpile-only', path.join('scripts', 'seed-test-user.ts')],
    {
      cwd: PATHS.serverDir,
      env: {
        ...process.env,
        DATABASE_PATH: PATHS.testDb,
        TEST_USER_EMAIL: TEST_USER.email,
        TEST_USER_PASSWORD: TEST_USER.password,
        TEST_USER_NAME: TEST_USER.name,
      },
      stdio: 'inherit',
    }
  );
}
