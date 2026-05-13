// Shared E2E test fixtures.
// Credentials must match what server/scripts/seed-test-user.ts inserts.

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const TEST_USER = {
  email: 'e2e@stateofthedart.test',
  password: 'TestPass123!',
  name: 'E2E Test User',
};

export const PATHS = {
  testDb: path.resolve(__dirname, '..', 'server', 'data', 'e2e-test.db'),
  serverDir: path.resolve(__dirname, '..', 'server'),
};

export const BACKEND_PORT = 3001;
export const FRONTEND_PORT = 4173;
