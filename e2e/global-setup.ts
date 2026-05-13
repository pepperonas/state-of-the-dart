import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { TEST_USER, PATHS, BACKEND_PORT } from './fixtures';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/**
 * Playwright globalSetup:
 *  1. Rebuild the frontend pointing VITE_API_URL at the test backend.
 *     The repo's checked-in .env points at production, which would make
 *     test browsers hit the live API.
 *  2. Wipe + seed the isolated E2E SQLite database with our test user.
 */
export default async function globalSetup() {
  // 1. Rebuild frontend with test API URL
  execFileSync('npm', ['run', 'build'], {
    cwd: ROOT,
    env: {
      ...process.env,
      VITE_API_URL: `http://localhost:${BACKEND_PORT}`,
    },
    stdio: 'inherit',
  });

  // 2. Seed test DB
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
