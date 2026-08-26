import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { schema, defaultAchievements } from './schema';
import { MASTER_ADMIN_EMAIL } from '../config/adminAllowlist';

let db: Database.Database | null = null;

export const initDatabase = (): Database.Database => {
  if (db) return db;

  // Ensure data directory exists
  const dataDir = path.dirname(config.databasePath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Initialize database
  db = new Database(config.databasePath);
  db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better performance
  db.pragma('foreign_keys = ON'); // Enable foreign key constraints

  // Execute schema
  db.exec(schema);

  // Migration: Add bot columns to players table if they don't exist
  try {
    const tableInfo = db.pragma('table_info(players)') as any[];
    const hasBotColumn = tableInfo.some(col => col.name === 'is_bot');

    if (!hasBotColumn) {
      console.log('🔧 Migrating players table: Adding bot columns...');
      db.exec(`
        ALTER TABLE players ADD COLUMN is_bot INTEGER DEFAULT 0;
        ALTER TABLE players ADD COLUMN bot_level INTEGER;
      `);
      console.log('✅ Bot columns added to players table');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }

  // Migration: Add main_player_id to users table if it doesn't exist
  try {
    const userTableInfo = db.pragma('table_info(users)') as any[];
    const hasMainPlayerColumn = userTableInfo.some(col => col.name === 'main_player_id');

    if (!hasMainPlayerColumn) {
      console.log('🔧 Migrating users table: Adding main_player_id column...');
      db.exec(`ALTER TABLE users ADD COLUMN main_player_id TEXT;`);
      console.log('✅ main_player_id column added to users table');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }

  // Migration: Add checkout tracking columns to player_stats if they don't exist
  try {
    const statsTableInfo = db.pragma('table_info(player_stats)') as any[];
    const hasCheckoutAttemptsColumn = statsTableInfo.some(col => col.name === 'total_checkout_attempts');

    if (!hasCheckoutAttemptsColumn) {
      console.log('🔧 Migrating player_stats table: Adding checkout tracking columns...');
      db.exec(`
        ALTER TABLE player_stats ADD COLUMN total_checkout_attempts INTEGER DEFAULT 0;
        ALTER TABLE player_stats ADD COLUMN total_checkout_hits INTEGER DEFAULT 0;
      `);
      console.log('✅ Checkout tracking columns added to player_stats table');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }

  // Migration: Add 'achievements' to bug_reports category CHECK constraint
  try {
    const checkSql = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='bug_reports'`).get() as any;
    if (checkSql?.sql && !checkSql.sql.includes("'achievements'")) {
      console.log('🔧 Migrating bug_reports table: Adding achievements category...');
      // Recreate table with updated CHECK constraint, preserving exact column structure
      const tableInfo = db.pragma('table_info(bug_reports)') as any[];
      const columns = tableInfo.map((col: any) => col.name).join(', ');
      const colDefs = tableInfo.map((col: any) => {
        let def = `${col.name} ${col.type}`;
        if (col.notnull) def += ' NOT NULL';
        if (col.dflt_value !== null) def += ` DEFAULT ${col.dflt_value}`;
        if (col.pk) def += ' PRIMARY KEY';
        // Add CHECK constraints
        if (col.name === 'severity') def += ` CHECK(severity IN ('low', 'medium', 'high', 'critical'))`;
        if (col.name === 'category') def += ` CHECK(category IN ('gameplay', 'ui', 'audio', 'performance', 'auth', 'data', 'achievements', 'other'))`;
        if (col.name === 'status') def += ` CHECK(status IN ('open', 'in_progress', 'resolved', 'closed'))`;
        return def;
      }).join(',\n          ');
      db.exec(`
        DROP TABLE IF EXISTS bug_reports_new;
        CREATE TABLE bug_reports_new (
          ${colDefs},
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        INSERT INTO bug_reports_new SELECT ${columns} FROM bug_reports;
        DROP TABLE bug_reports;
        ALTER TABLE bug_reports_new RENAME TO bug_reports;
        CREATE INDEX IF NOT EXISTS idx_bug_reports_user ON bug_reports(user_id);
        CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);
        CREATE INDEX IF NOT EXISTS idx_bug_reports_severity ON bug_reports(severity);
        CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at ON bug_reports(created_at);
      `);
      console.log('✅ achievements category added to bug_reports');
    }
  } catch (error) {
    console.error('Migration error (bug_reports category):', error);
  }

  // Migration: Add volume/toggle columns to user_settings if they don't exist.
  // These back the sound/caller/effects volumes and the confirm-scores /
  // show-stats-during-game / vibration toggles, which previously weren't persisted.
  try {
    const settingsInfo = db.pragma('table_info(user_settings)') as any[];
    const existing = new Set(settingsInfo.map((col: any) => col.name));
    const newColumns: Array<{ name: string; def: string }> = [
      { name: 'sound_volume', def: 'INTEGER DEFAULT 70' },
      { name: 'caller_volume', def: 'INTEGER DEFAULT 70' },
      { name: 'effects_volume', def: 'INTEGER DEFAULT 70' },
      { name: 'show_stats_during_game', def: 'INTEGER DEFAULT 1' },
      { name: 'confirm_scores', def: 'INTEGER DEFAULT 0' },
      { name: 'vibration_enabled', def: 'INTEGER DEFAULT 1' },
    ];
    const missing = newColumns.filter(c => !existing.has(c.name));
    if (missing.length > 0) {
      console.log('🔧 Migrating user_settings table: Adding volume/toggle columns...');
      for (const col of missing) {
        db.exec(`ALTER TABLE user_settings ADD COLUMN ${col.name} ${col.def};`);
      }
      console.log(`✅ Added ${missing.length} column(s) to user_settings`);
    }
  } catch (error) {
    console.error('Migration error (user_settings columns):', error);
  }

  // Seed default achievements if empty
  const achievementCount = db.prepare('SELECT COUNT(*) as count FROM achievements').get() as { count: number };
  if (achievementCount.count === 0) {
    const insertAchievement = db.prepare(`
      INSERT INTO achievements (id, name, description, icon, category, points, rarity, target)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const seedAchievements = db.transaction(() => {
      for (const achievement of defaultAchievements) {
        insertAchievement.run(
          achievement.id,
          achievement.name,
          achievement.description,
          achievement.icon,
          achievement.category,
          achievement.points,
          achievement.rarity,
          achievement.target || null
        );
      }
    });

    seedAchievements();
    console.log(`✅ Seeded ${defaultAchievements.length} default achievements`);
  }

  // Reconcile admin rights with the allowlist: the master address gets them,
  // EVERY other account loses them. The demotion half matters — accounts
  // promoted before the make-admin endpoint was removed would otherwise keep
  // full access forever, with no way left in the UI to take it back.
  try {
    const granted = db.prepare(
      'UPDATE users SET is_admin = 1 WHERE lower(email) = ? AND is_admin != 1'
    ).run(MASTER_ADMIN_EMAIL) as { changes: number };
    const revoked = db.prepare(
      'UPDATE users SET is_admin = 0 WHERE lower(email) != ? AND is_admin = 1'
    ).run(MASTER_ADMIN_EMAIL) as { changes: number };

    if (granted.changes) console.log(`✅ Master admin rights ensured for ${MASTER_ADMIN_EMAIL}`);
    if (revoked.changes) console.log(`✅ Revoked stale admin rights from ${revoked.changes} account(s)`);
  } catch (error) {
    console.error('Admin reconciliation error:', error);
  }

  // Schedule periodic WAL checkpoint to prevent corruption
  // Runs every 5 minutes to ensure WAL data is written to main DB
  setInterval(() => {
    if (db) {
      try {
        db.pragma('wal_checkpoint(PASSIVE)');
      } catch (err) {
        console.error('WAL checkpoint failed:', err);
      }
    }
  }, 5 * 60 * 1000);

  console.log('✅ Database initialized successfully');
  return db;
};

export const getDatabase = (): Database.Database => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};

export const closeDatabase = (): void => {
  if (db) {
    // Final checkpoint before closing to ensure all WAL data is written
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
    } catch (err) {
      console.error('Final WAL checkpoint failed:', err);
    }
    db.close();
    db = null;
    console.log('✅ Database connection closed');
  }
};

// Graceful shutdown
process.on('SIGINT', () => {
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDatabase();
  process.exit(0);
});
