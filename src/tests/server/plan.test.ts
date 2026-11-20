import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
import { schema } from '../../../server/src/database/schema';
import {
  planOf, planForTenant, checkNewPlayer, checkNewMatch, checkTrainingMode, checkRename, FREE_LIMITS, PREMIUM_LIMITS, GUEST_PLAYER_NAME,
} from '../../../server/src/services/plan';
import { GUEST_NAME } from '../../utils/matchSetup';
import { checkSocketAccess } from '../../../server/src/socket/access';
import * as appPlan from '../../utils/plan';

const require_ = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BetterSqlite3 = require_('../../../server/node_modules/better-sqlite3') as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jwt = require_('../../../server/node_modules/jsonwebtoken') as any;

const NOW = Date.UTC(2026, 10, 20, 12);
const DAY = 86_400_000;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any;

const setUser = (status: string, trialEndsAt: number | null, isAdmin = 0, subEnds: number | null = null) =>
  db.prepare('UPDATE users SET subscription_status = ?, trial_ends_at = ?, is_admin = ?, subscription_ends_at = ? WHERE id = ?')
    .run(status, trialEndsAt, isAdmin, subEnds, 'u');
const addPlayer = (id: string, isBot = 0, level: number | null = null) =>
  db.prepare('INSERT INTO players (id, tenant_id, name, is_bot, bot_level, created_at) VALUES (?, ?, ?, ?, ?, 0)').run(id, 't', id, isBot, level);

beforeEach(() => {
  db = new BetterSqlite3(':memory:');
  db.exec(schema);
  db.prepare("INSERT INTO users (id, email, name, created_at, last_active) VALUES ('u', 'u@x', 'U', 0, 0)").run();
  db.prepare("INSERT INTO tenants (id, user_id, name, created_at, last_active) VALUES ('t', 'u', 'T', 0, 0)").run();
});

describe('planOf', () => {
  it('premium: running trial, lifetime, active subscription, admin', () => {
    expect(planOf({ subscription_status: 'trial', trial_ends_at: NOW + DAY }, NOW)).toBe('premium');
    expect(planOf({ subscription_status: 'lifetime' }, NOW)).toBe('premium');
    expect(planOf({ subscription_status: 'active', subscription_ends_at: null }, NOW)).toBe('premium');
    expect(planOf({ subscription_status: 'active', subscription_ends_at: NOW + DAY }, NOW)).toBe('premium');
    expect(planOf({ subscription_status: 'expired', is_admin: 1 }, NOW)).toBe('premium');
  });

  it('free: trial over, subscription ended, cancelled, unknown, no user', () => {
    expect(planOf({ subscription_status: 'trial', trial_ends_at: NOW - 1 }, NOW)).toBe('free');
    expect(planOf({ subscription_status: 'active', subscription_ends_at: NOW - 1 }, NOW)).toBe('free');
    expect(planOf({ subscription_status: 'expired' }, NOW)).toBe('free');
    expect(planOf({ subscription_status: 'canceled' }, NOW)).toBe('free');
    expect(planOf(null, NOW)).toBe('free');
  });

  it('is read from the database for a tenant', () => {
    setUser('trial', NOW + DAY);
    expect(planForTenant(db, 't', NOW)).toBe('premium');
    setUser('trial', NOW - DAY);
    expect(planForTenant(db, 't', NOW)).toBe('free');
  });
});

describe('free tier limits', () => {
  it('three own players, then no more; bots do not count', () => {
    addPlayer('p1'); addPlayer('p2'); addPlayer('b1', 1, 3);
    expect(checkNewPlayer(db, 't', 'free', { isBot: false })).toBeNull();
    addPlayer('p3');
    expect(checkNewPlayer(db, 't', 'free', { isBot: false })).toMatchObject({ code: 'premium_required', feature: 'players', limit: 3 });
    expect(checkNewPlayer(db, 't', 'free', { isBot: true, botLevel: 5 })).toBeNull();
    expect(checkNewPlayer(db, 't', 'premium', { isBot: false })).toBeNull();
  });

  it('one auto-added "Guest" opponent is exempt — only one', () => {
    addPlayer('p1'); addPlayer('p2'); addPlayer('p3');
    expect(checkNewPlayer(db, 't', 'free', { isBot: false, name: 'Guest' })).toBeNull();
    db.prepare("INSERT INTO players (id, tenant_id, name, created_at) VALUES ('g1', 't', 'Guest', 0)").run();
    // A second "Guest" is just a player with a name (security review, 0.49.0).
    expect(checkNewPlayer(db, 't', 'free', { isBot: false, name: 'Guest' })).toMatchObject({ feature: 'players' });
  });

  it('renaming the guest into a real player counts against the limit', () => {
    addPlayer('p1'); addPlayer('p2'); addPlayer('p3');
    db.prepare("INSERT INTO players (id, tenant_id, name, created_at) VALUES ('g1', 't', 'Guest', 0)").run();
    expect(checkRename(db, 't', 'free', 'Guest', 'Dora')).toMatchObject({ feature: 'players' });
    expect(checkRename(db, 't', 'free', 'Guest', undefined)).toBeNull();
    expect(checkRename(db, 't', 'free', 'Anna', 'Annika')).toBeNull();
    expect(checkRename(db, 't', 'premium', 'Guest', 'Dora')).toBeNull();
    db.prepare("DELETE FROM players WHERE id = 'p3'").run();
    expect(checkRename(db, 't', 'free', 'Guest', 'Dora')).toBeNull();
  });

  it('bots up to level 5', () => {
    expect(checkNewPlayer(db, 't', 'free', { isBot: true, botLevel: 6 })).toMatchObject({ feature: 'bot_level' });
    expect(checkNewPlayer(db, 't', 'premium', { isBot: true, botLevel: 10 })).toBeNull();
  });

  it('two per match; a strong bot needs premium; eight is the hard ceiling for everyone', () => {
    addPlayer('a'); addPlayer('b'); addPlayer('c'); addPlayer('bot9', 1, 9);
    const two = [{ playerId: 'a' }, { playerId: 'b' }];
    expect(checkNewMatch(db, 't', 'free', two)).toBeNull();
    expect(checkNewMatch(db, 't', 'free', [...two, { playerId: 'c' }])).toMatchObject({ feature: 'match_players', limit: 2 });
    expect(checkNewMatch(db, 't', 'free', [{ playerId: 'a' }, { playerId: 'bot9' }])).toMatchObject({ feature: 'bot_level' });
    expect(checkNewMatch(db, 't', 'premium', [{ playerId: 'a' }, { playerId: 'bot9' }, { playerId: 'c' }])).toBeNull();
    const nine = Array.from({ length: 9 }, (_, i) => ({ playerId: `x${i}` }));
    expect(checkNewMatch(db, 't', 'premium', nine)).toMatchObject({ feature: 'match_players', limit: 8 });
  });

  it('two training modes', () => {
    expect(checkTrainingMode('free', 'doubles')).toBeNull();
    expect(checkTrainingMode('free', 'around-the-clock')).toBeNull();
    expect(checkTrainingMode('free', 'bobs-27')).toMatchObject({ feature: 'training' });
    expect(checkTrainingMode('premium', 'bobs-27')).toBeNull();
  });
});

describe('online access (socket handshake)', () => {
  const secret = 'test-secret';
  const token = jwt.sign({ userId: 'u', email: 'u@x' }, secret);

  it('needs a valid token', () => {
    expect(checkSocketAccess(undefined, db, secret, NOW)).toBe('unauthorized');
    expect(checkSocketAccess('garbage', db, secret, NOW)).toBe('unauthorized');
    expect(checkSocketAccess(jwt.sign({ userId: 'u' }, 'other-secret'), db, secret, NOW)).toBe('unauthorized');
  });

  it('is premium only — the plan comes from the database, not from the token', () => {
    setUser('trial', NOW - DAY);
    const stale = jwt.sign({ userId: 'u', subscriptionStatus: 'lifetime' }, secret);
    expect(checkSocketAccess(stale, db, secret, NOW)).toBe('premium_required');
    setUser('lifetime', null);
    expect(checkSocketAccess(token, db, secret, NOW)).toBe('ok');
  });
});

describe('the app knows the same limits as the server', () => {
  it('limits and the plan rule are identical', () => {
    expect(appPlan.FREE_LIMITS).toEqual(FREE_LIMITS);
    expect(appPlan.PREMIUM_LIMITS).toEqual(PREMIUM_LIMITS);
    expect(appPlan.GUEST_PLAYER_NAME).toBe(GUEST_PLAYER_NAME);
    expect(GUEST_NAME).toBe(GUEST_PLAYER_NAME);
    for (const [status, trial, admin] of [['trial', NOW + DAY, 0], ['trial', NOW - DAY, 0], ['lifetime', null, 0], ['expired', null, 1], ['expired', null, 0]] as const) {
      const server = planOf({ subscription_status: status, trial_ends_at: trial, is_admin: admin }, NOW);
      const app = appPlan.planOfUser({ subscriptionStatus: status, trialEndsAt: trial ?? undefined, isAdmin: admin === 1 }, NOW);
      expect(app, `${status}/${trial}/${admin}`).toBe(server);
    }
  });
});
