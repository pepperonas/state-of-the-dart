/**
 * Free and premium (0.49.0) — the server side.
 *
 * Every account is premium during its trial, with an active or lifetime
 * subscription, or as an admin; otherwise it is free. Free is a real tier,
 * not a lock-out: X01, Cricket, Around the Clock and Shanghai with up to two
 * per match, three own players, bots up to level 5, two training modes and
 * the last 20 games.
 *
 * The plan is read from the database on every request, never from the JWT:
 * a token issued during the trial would otherwise stay premium until it
 * expires. ⚠️ `src/utils/plan.ts` mirrors the limits for the app; a test
 * keeps the two identical.
 */

export type Plan = 'free' | 'premium';

export const FREE_LIMITS = {
  /** Own (non-bot) players an account may create. */
  ownPlayers: 3,
  /** Participants per match, bots included. */
  matchPlayers: 2,
  /** Strongest bot level. */
  botMaxLevel: 5,
  /** Training modes open to everyone. */
  trainingModes: ['doubles', 'around-the-clock'] as readonly string[],
  /** Completed matches the history shows. */
  matchHistory: 20,
} as const;

export const PREMIUM_LIMITS = {
  matchPlayers: 8,
  botMaxLevel: 10,
} as const;

/** Premium-only features (the 402 `feature` field, the app's lock labels). */
export type PremiumFeature = 'online' | 'tournaments' | 'heatmap' | 'training' | 'players' | 'match_players' | 'bot_level' | 'history';

export interface PlanUser {
  subscription_status?: string | null;
  trial_ends_at?: number | null;
  subscription_ends_at?: number | null;
  is_admin?: number | null;
}

export const planOf = (user: PlanUser | undefined | null, now = Date.now()): Plan => {
  if (!user) return 'free';
  if (user.is_admin === 1) return 'premium';
  const status = user.subscription_status;
  if (status === 'lifetime') return 'premium';
  if (status === 'active' && (!user.subscription_ends_at || user.subscription_ends_at > now)) return 'premium';
  if (status === 'trial' && (user.trial_ends_at ?? 0) > now) return 'premium';
  return 'free';
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

/** The plan of the account that owns this tenant, fresh from the database. */
export const planForTenant = (db: Db, tenantId: string, now = Date.now()): Plan => {
  const user = db.prepare(`
    SELECT u.subscription_status, u.trial_ends_at, u.subscription_ends_at, u.is_admin
    FROM tenants t JOIN users u ON u.id = t.user_id
    WHERE t.id = ?
  `).get(tenantId) as PlanUser | undefined;
  return planOf(user, now);
};

export const planForUser = (db: Db, userId: string, now = Date.now()): Plan => {
  const user = db.prepare('SELECT subscription_status, trial_ends_at, subscription_ends_at, is_admin FROM users WHERE id = ?')
    .get(userId) as PlanUser | undefined;
  return planOf(user, now);
};

/** The body of a 402: what was refused and why, for the app's upgrade hint. */
export const premiumRequired = (feature: PremiumFeature, limit?: number) => ({
  error: 'Premium required',
  code: 'premium_required',
  feature,
  ...(limit !== undefined ? { limit } : {}),
});

/** The auto-added opponent of a solo start; never counts as an own player (mirrors matchSetup GUEST_NAME). */
export const GUEST_PLAYER_NAME = 'Guest';

/** A bot level is an integer 1–10 or absent; anything else (NaN slipped past `> 5`) is refused. */
export const validBotLevel = (botLevel: unknown): boolean =>
  botLevel === undefined || botLevel === null || (Number.isInteger(Number(botLevel)) && Number(botLevel) >= 1 && Number(botLevel) <= PREMIUM_LIMITS.botMaxLevel);

export interface PlayerInput { isBot?: unknown; botLevel?: unknown; name?: unknown }

/** Can a free account create this player? Returns the refusal, or null. */
export const checkNewPlayer = (db: Db, tenantId: string, plan: Plan, input: PlayerInput) => {
  if (plan === 'premium') return null;
  if (input.isBot) {
    // validBotLevel ran before (the route answers 400 otherwise).
    return Number(input.botLevel ?? 1) > FREE_LIMITS.botMaxLevel ? premiumRequired('bot_level', FREE_LIMITS.botMaxLevel) : null;
  }
  // One guest is exempt — the auto-added opponent of a solo start. Only one:
  // the name is the client's word, so a second "Guest" counts like anyone.
  if (input.name === GUEST_PLAYER_NAME && !hasGuest(db, tenantId)) return null;
  return ownPlayerCount(db, tenantId) >= FREE_LIMITS.ownPlayers ? premiumRequired('players', FREE_LIMITS.ownPlayers) : null;
};

const hasGuest = (db: Db, tenantId: string): boolean =>
  !!db.prepare('SELECT 1 FROM players WHERE tenant_id = ? AND (is_bot IS NULL OR is_bot = 0) AND name = ?').get(tenantId, GUEST_PLAYER_NAME);

/** Own players that count: no bots, and the one exempt guest left out. */
const ownPlayerCount = (db: Db, tenantId: string): number => {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM players WHERE tenant_id = ? AND (is_bot IS NULL OR is_bot = 0)').get(tenantId) as { n: number };
  return hasGuest(db, tenantId) ? n - 1 : n;
};

/**
 * Renaming the exempt guest into a real name turns it into an own player —
 * the same limit applies (otherwise "create Guest, rename" is a way around it).
 */
export const checkRename = (db: Db, tenantId: string, plan: Plan, fromName: unknown, toName: unknown) => {
  if (plan === 'premium' || fromName !== GUEST_PLAYER_NAME || toName === undefined || toName === GUEST_PLAYER_NAME) return null;
  // After the rename the guest is gone, so it counts in full.
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM players WHERE tenant_id = ? AND (is_bot IS NULL OR is_bot = 0)').get(tenantId) as { n: number };
  return n > FREE_LIMITS.ownPlayers ? premiumRequired('players', FREE_LIMITS.ownPlayers) : null;
};

/** Can a free account start this match? Only new matches are checked — a match begun in the trial may be finished. */
export const checkNewMatch = (db: Db, tenantId: string, plan: Plan, players: unknown) => {
  const list = Array.isArray(players) ? players : [];
  if (list.length > PREMIUM_LIMITS.matchPlayers) return premiumRequired('match_players', PREMIUM_LIMITS.matchPlayers);
  if (plan === 'premium') return null;
  if (list.length > FREE_LIMITS.matchPlayers) return premiumRequired('match_players', FREE_LIMITS.matchPlayers);
  const ids = list.map((p: { playerId?: unknown }) => p?.playerId).filter((id): id is string => typeof id === 'string');
  if (ids.length) {
    const strong = db.prepare(`
      SELECT COUNT(*) AS n FROM players
      WHERE tenant_id = ? AND is_bot = 1 AND bot_level > ? AND id IN (${ids.map(() => '?').join(',')})
    `).get(tenantId, FREE_LIMITS.botMaxLevel, ...ids) as { n: number };
    if (strong.n > 0) return premiumRequired('bot_level', FREE_LIMITS.botMaxLevel);
  }
  return null;
};

/**
 * A match save (POST is create-or-replace). New matches are checked in full.
 * An existing one (begun in the trial) may be re-sent with its stored roster
 * as it is; anything new on it — more players, or a swap such as a strong bot
 * for a player — is checked like a new match (security review, 0.49.0).
 */
export const checkMatchSave = (db: Db, tenantId: string, plan: Plan, matchId: unknown, players: unknown) => {
  const exists = db.prepare('SELECT 1 FROM matches WHERE id = ? AND tenant_id = ?').get(matchId, tenantId);
  if (exists) {
    const seated = new Set((db.prepare('SELECT player_id FROM match_players WHERE match_id = ?').all(matchId) as Array<{ player_id: string }>).map(r => r.player_id));
    const posted = Array.isArray(players) ? players.map((p: { playerId?: unknown }) => p?.playerId) : [];
    if (posted.length <= seated.size && posted.every(pid => typeof pid === 'string' && seated.has(pid))) return null;
  }
  return checkNewMatch(db, tenantId, plan, players);
};

export const checkTrainingMode = (plan: Plan, type: unknown) =>
  plan === 'premium' || FREE_LIMITS.trainingModes.includes(String(type)) ? null : premiumRequired('training');
