export const schema = `
-- Users (with Authentication & Subscription)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT NOT NULL,
  avatar TEXT,
  email_verified INTEGER DEFAULT 0,
  verification_token TEXT,
  verification_token_expires INTEGER,
  reset_password_token TEXT,
  reset_password_expires INTEGER,
  google_id TEXT UNIQUE,
  is_admin INTEGER DEFAULT 0,
  subscription_status TEXT DEFAULT 'trial',
  subscription_plan TEXT,
  trial_ends_at INTEGER,
  subscription_ends_at INTEGER,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at INTEGER NOT NULL,
  last_active INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);

-- Tenants (Profiles) - now linked to users
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  created_at INTEGER NOT NULL,
  last_active INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tenants_user ON tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_last_active ON tenants(last_active);

-- Players
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  is_bot INTEGER DEFAULT 0,
  bot_level INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_players_tenant ON players(tenant_id);

-- Player Stats
CREATE TABLE IF NOT EXISTS player_stats (
  player_id TEXT PRIMARY KEY,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  total_legs_played INTEGER DEFAULT 0,
  total_legs_won INTEGER DEFAULT 0,
  highest_checkout INTEGER DEFAULT 0,
  total_180s INTEGER DEFAULT 0,
  total_171_plus INTEGER DEFAULT 0,
  total_140_plus INTEGER DEFAULT 0,
  total_100_plus INTEGER DEFAULT 0,
  total_60_plus INTEGER DEFAULT 0,
  best_average REAL DEFAULT 0,
  average_overall REAL DEFAULT 0,
  checkout_percentage REAL DEFAULT 0,
  best_leg INTEGER DEFAULT 999,
  nine_dart_finishes INTEGER DEFAULT 0,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Player Heatmap (aggregated dart throw data)
CREATE TABLE IF NOT EXISTS heatmap_data (
  player_id TEXT PRIMARY KEY,
  segments TEXT NOT NULL, -- JSON object
  total_darts INTEGER DEFAULT 0,
  last_updated INTEGER NOT NULL,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Matches
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  game_type TEXT NOT NULL,
  status TEXT NOT NULL,
  winner TEXT,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  settings TEXT NOT NULL, -- JSON
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_matches_tenant ON matches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_matches_started_at ON matches(started_at);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

-- Match Players
CREATE TABLE IF NOT EXISTS match_players (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  match_average REAL DEFAULT 0,
  first9_average REAL DEFAULT 0,
  highest_score INTEGER DEFAULT 0,
  checkouts_hit INTEGER DEFAULT 0,
  checkout_attempts INTEGER DEFAULT 0,
  match_180s INTEGER DEFAULT 0,
  match_171_plus INTEGER DEFAULT 0,
  match_140_plus INTEGER DEFAULT 0,
  match_100_plus INTEGER DEFAULT 0,
  match_60_plus INTEGER DEFAULT 0,
  darts_thrown INTEGER DEFAULT 0,
  legs_won INTEGER DEFAULT 0,
  sets_won INTEGER DEFAULT 0,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_match_players_match ON match_players(match_id);
CREATE INDEX IF NOT EXISTS idx_match_players_player ON match_players(player_id);

-- Legs
CREATE TABLE IF NOT EXISTS legs (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  leg_number INTEGER NOT NULL,
  winner TEXT,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_legs_match ON legs(match_id);

-- Throws
CREATE TABLE IF NOT EXISTS throws (
  id TEXT PRIMARY KEY,
  leg_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  darts TEXT NOT NULL, -- JSON array
  score INTEGER NOT NULL,
  remaining INTEGER NOT NULL,
  timestamp INTEGER NOT NULL,
  is_checkout_attempt INTEGER DEFAULT 0,
  is_bust INTEGER DEFAULT 0,
  visit_number INTEGER NOT NULL,
  running_average REAL,
  first9_average REAL,
  FOREIGN KEY (leg_id) REFERENCES legs(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_throws_leg ON throws(leg_id);
CREATE INDEX IF NOT EXISTS idx_throws_player ON throws(player_id);

-- Heatmap Data
CREATE TABLE IF NOT EXISTS heatmap_data (
  player_id TEXT PRIMARY KEY,
  segments TEXT NOT NULL, -- JSON object
  total_darts INTEGER DEFAULT 0,
  last_updated INTEGER NOT NULL,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Training Sessions
CREATE TABLE IF NOT EXISTS training_sessions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  type TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  score INTEGER,
  personal_best INTEGER DEFAULT 0,
  total_darts INTEGER DEFAULT 0,
  total_hits INTEGER DEFAULT 0,
  total_attempts INTEGER DEFAULT 0,
  hit_rate REAL,
  average_score REAL,
  highest_score INTEGER,
  duration INTEGER,
  settings TEXT, -- JSON
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_training_tenant ON training_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_training_player ON training_sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_training_started_at ON training_sessions(started_at);

-- Training Results
CREATE TABLE IF NOT EXISTS training_results (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  target_segment INTEGER,
  target_multiplier INTEGER,
  darts_thrown TEXT NOT NULL, -- JSON array
  hit INTEGER DEFAULT 0,
  timestamp INTEGER NOT NULL,
  score INTEGER,
  FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_training_results_session ON training_results(session_id);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  points INTEGER NOT NULL,
  rarity TEXT NOT NULL,
  target INTEGER
);

-- Player Achievements
CREATE TABLE IF NOT EXISTS player_achievements (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_at INTEGER NOT NULL,
  progress REAL,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
  UNIQUE(player_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_player_achievements_player ON player_achievements(player_id);
CREATE INDEX IF NOT EXISTS idx_player_achievements_achievement ON player_achievements(achievement_id);

-- Personal Bests
CREATE TABLE IF NOT EXISTS personal_bests (
  player_id TEXT PRIMARY KEY,
  data TEXT NOT NULL, -- JSON object with all personal best data
  last_updated INTEGER NOT NULL,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- User Settings
CREATE TABLE IF NOT EXISTS user_settings (
  tenant_id TEXT PRIMARY KEY,
  theme TEXT DEFAULT 'dark',
  language TEXT DEFAULT 'de',
  sound_enabled INTEGER DEFAULT 1,
  caller_voice TEXT DEFAULT 'john',
  caller_language TEXT DEFAULT 'en',
  auto_next_player INTEGER DEFAULT 1,
  show_checkout_suggestions INTEGER DEFAULT 1,
  enable_achievements_hints INTEGER DEFAULT 1,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
`;

// Default achievements to seed
export const defaultAchievements = [
  {
    id: 'first-180',
    name: 'Maximum!',
    description: 'Throw your first 180',
    icon: '🎯',
    category: 'score',
    points: 50,
    rarity: 'rare',
    target: 1
  },
  {
    id: 'ten-180s',
    name: 'Maximum Machine',
    description: 'Throw 10 maximums (180s)',
    icon: '🔥',
    category: 'score',
    points: 100,
    rarity: 'epic',
    target: 10
  },
  {
    id: 'first-win',
    name: 'First Victory',
    description: 'Win your first game',
    icon: '🏆',
    category: 'milestone',
    points: 25,
    rarity: 'common',
    target: 1
  },
  {
    id: 'winning-streak-5',
    name: 'On Fire',
    description: 'Win 5 games in a row',
    icon: '🔥',
    category: 'milestone',
    points: 150,
    rarity: 'epic',
    target: 5
  },
  {
    id: 'high-checkout',
    name: 'Big Finish',
    description: 'Checkout 100+',
    icon: '💥',
    category: 'checkout',
    points: 75,
    rarity: 'rare',
    target: 100
  },
  {
    id: 'perfect-checkout',
    name: 'Perfection',
    description: 'Checkout with 100% accuracy in a match',
    icon: '⭐',
    category: 'checkout',
    points: 200,
    rarity: 'legendary',
    target: 100
  },
  {
    id: 'nine-darter',
    name: 'Nine-Dart Finish',
    description: 'Complete a leg in 9 darts',
    icon: '👑',
    category: 'special',
    points: 500,
    rarity: 'legendary',
    target: 9
  },
  {
    id: 'average-80',
    name: 'Consistent',
    description: 'Achieve 80+ average in a game',
    icon: '📊',
    category: 'score',
    points: 100,
    rarity: 'epic',
    target: 80
  },
  {
    id: 'average-100',
    name: 'Pro Player',
    description: 'Achieve 100+ average in a game',
    icon: '🎖️',
    category: 'score',
    points: 250,
    rarity: 'legendary',
    target: 100
  },
  {
    id: 'games-played-10',
    name: 'Getting Started',
    description: 'Play 10 games',
    icon: '🎮',
    category: 'milestone',
    points: 50,
    rarity: 'common',
    target: 10
  },
  {
    id: 'games-played-50',
    name: 'Dedicated',
    description: 'Play 50 games',
    icon: '💪',
    category: 'milestone',
    points: 150,
    rarity: 'rare',
    target: 50
  },
  {
    id: 'games-played-100',
    name: 'Veteran',
    description: 'Play 100 games',
    icon: '🏅',
    category: 'milestone',
    points: 300,
    rarity: 'epic',
    target: 100
  },
  {
    id: 'triple-treble',
    name: 'Triple Threat',
    description: 'Hit three triples in one throw',
    icon: '🎯',
    category: 'special',
    points: 150,
    rarity: 'epic',
    target: 3
  },
  {
    id: 'all-doubles',
    name: 'Double Master',
    description: 'Complete doubles training perfectly',
    icon: '🎭',
    category: 'special',
    points: 200,
    rarity: 'epic',
    target: 20
  },
  {
    id: 'bullseye-finish',
    name: 'Bulls Eye',
    description: 'Win with a bullseye checkout',
    icon: '🎪',
    category: 'checkout',
    points: 100,
    rarity: 'rare',
    target: 1
  }
];
