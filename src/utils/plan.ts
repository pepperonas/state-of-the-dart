/**
 * Free and premium (0.49.0) — the app side.
 *
 * ⚠️ A mirror of `server/src/services/plan.ts`; `src/tests/server/plan.test.ts`
 * keeps the limits and the rule identical. The server is the one that
 * enforces (402); the app only shows what is open and what is not, so nobody
 * runs into a refusal they could have seen coming.
 */
export type Plan = 'free' | 'premium';

export const FREE_LIMITS = {
  ownPlayers: 3,
  matchPlayers: 2,
  botMaxLevel: 5,
  trainingModes: ['doubles', 'around-the-clock'] as readonly string[],
  matchHistory: 20,
} as const;

export const PREMIUM_LIMITS = {
  matchPlayers: 8,
  botMaxLevel: 10,
} as const;

export type PremiumFeature = 'online' | 'tournaments' | 'heatmap' | 'training' | 'players' | 'match_players' | 'bot_level' | 'history' | 'export' | 'scoreboard';

export interface PlanUserLike {
  subscriptionStatus?: string;
  trialEndsAt?: number;
  subscriptionEndsAt?: number;
  isAdmin?: boolean;
}

export const planOfUser = (user: PlanUserLike | null | undefined, now = Date.now()): Plan => {
  if (!user) return 'free';
  if (user.isAdmin) return 'premium';
  const s = user.subscriptionStatus;
  if (s === 'lifetime') return 'premium';
  if (s === 'active' && (!user.subscriptionEndsAt || user.subscriptionEndsAt > now)) return 'premium';
  if (s === 'trial' && (user.trialEndsAt ?? 0) > now) return 'premium';
  return 'free';
};

/** What a plan allows, for the screens. */
export const limitsOf = (plan: Plan) => ({
  matchPlayers: plan === 'premium' ? PREMIUM_LIMITS.matchPlayers : FREE_LIMITS.matchPlayers,
  botMaxLevel: plan === 'premium' ? PREMIUM_LIMITS.botMaxLevel : FREE_LIMITS.botMaxLevel,
  ownPlayers: plan === 'premium' ? Infinity : FREE_LIMITS.ownPlayers,
  trainingOpen: (mode: string) => plan === 'premium' || FREE_LIMITS.trainingModes.includes(mode),
  historyLimit: plan === 'premium' ? Infinity : FREE_LIMITS.matchHistory,
});

/** The event the API client raises on a 402, for the global upgrade hint. */
export const PLAN_LIMIT_EVENT = 'plan:limit';
export interface PlanLimitDetail { feature?: PremiumFeature; limit?: number }

/** Open the upgrade dialog from the app itself (a limit the screen already knows). */
export const announcePlanLimit = (detail: PlanLimitDetail): void => {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(PLAN_LIMIT_EVENT, { detail }));
};

/** The auto-added opponent of a solo start ("Guest") is not one of your own players. */
export const GUEST_PLAYER_NAME = 'Guest';

/** Own players that count against the free limit: no bots, no guest. */
export const countOwnPlayers = (players: Array<{ isBot?: boolean; name: string }>): number =>
  players.filter(p => !p.isBot && p.name !== GUEST_PLAYER_NAME).length;
