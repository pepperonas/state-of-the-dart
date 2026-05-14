/**
 * Seed a fresh isolated test database with one verified user.
 * Invoked by Playwright globalSetup before E2E runs.
 *
 * Env vars:
 *   DATABASE_PATH - required, where to write the SQLite file
 *   TEST_USER_EMAIL, TEST_USER_PASSWORD, TEST_USER_NAME - optional overrides
 */
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { schema } from '../src/database/schema';

const dbPath = process.env.DATABASE_PATH;
if (!dbPath) {
  console.error('DATABASE_PATH env var is required');
  process.exit(1);
}

const email = (process.env.TEST_USER_EMAIL || 'e2e@stateofthedart.test').toLowerCase();
const password = process.env.TEST_USER_PASSWORD || 'TestPass123!';
const name = process.env.TEST_USER_NAME || 'E2E Test User';

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

const db = new Database(dbPath);
db.exec(schema);

const now = Date.now();
const trialEnd = now + 30 * 24 * 60 * 60 * 1000;
const passwordHash = bcrypt.hashSync(password, 10);
const userId = uuidv4();
const tenantId = uuidv4();

db.prepare(
  `INSERT INTO users (
    id, email, password_hash, name, email_verified,
    subscription_status, trial_ends_at,
    created_at, last_active
  ) VALUES (?, ?, ?, ?, 1, 'trial', ?, ?, ?)`
).run(userId, email, passwordHash, name, trialEnd, now, now);

// The auth middleware refuses any /api/* call without a tenant; create one.
db.prepare(
  `INSERT INTO tenants (id, user_id, name, avatar, created_at, last_active)
   VALUES (?, ?, ?, '👤', ?, ?)`
).run(tenantId, userId, name, now, now);

db.close();

console.log(JSON.stringify({ email, password, name, userId, tenantId, dbPath }));
