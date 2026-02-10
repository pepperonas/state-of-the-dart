#!/usr/bin/env ts-node
/**
 * Migration: Add game_id column and make unlocked_at nullable in player_achievements
 *
 * Run with: npx ts-node server/scripts/migrate-player-achievements.ts
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/database.db');

console.log('🔧 Migrating player_achievements table...');
console.log(`📁 Database: ${DB_PATH}`);

if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Database file not found!');
  process.exit(1);
}

const db = new Database(DB_PATH);

try {
  // Begin transaction
  db.prepare('BEGIN TRANSACTION').run();

  console.log('📋 Checking current table structure...');
  const tableInfo = db.prepare('PRAGMA table_info(player_achievements)').all() as any[];

  const hasGameId = tableInfo.some((col: any) => col.name === 'game_id');
  const unlockedAtCol = tableInfo.find((col: any) => col.name === 'unlocked_at');
  const isUnlockedAtNullable = unlockedAtCol && unlockedAtCol.notnull === 0;

  console.log('Current columns:', tableInfo.map((col: any) => col.name).join(', '));
  console.log(`- game_id exists: ${hasGameId}`);
  console.log(`- unlocked_at is nullable: ${isUnlockedAtNullable}`);

  if (hasGameId && isUnlockedAtNullable) {
    console.log('✅ Table already migrated, nothing to do.');
    db.prepare('ROLLBACK').run();
    db.close();
    process.exit(0);
  }

  console.log('🔄 Recreating table with new structure...');

  // Step 1: Rename old table
  db.prepare('ALTER TABLE player_achievements RENAME TO player_achievements_old').run();

  // Step 2: Create new table with updated schema
  db.prepare(`
    CREATE TABLE player_achievements (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      achievement_id TEXT NOT NULL,
      unlocked_at INTEGER,
      progress REAL,
      game_id TEXT,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
      FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
      UNIQUE(player_id, achievement_id)
    )
  `).run();

  // Step 3: Copy data from old table to new table
  console.log('📦 Copying existing data...');
  db.prepare(`
    INSERT INTO player_achievements (id, player_id, achievement_id, unlocked_at, progress)
    SELECT id, player_id, achievement_id, unlocked_at, progress
    FROM player_achievements_old
  `).run();

  // Step 4: Drop old table
  db.prepare('DROP TABLE player_achievements_old').run();

  // Step 5: Recreate indexes
  console.log('🔍 Recreating indexes...');
  db.prepare('CREATE INDEX IF NOT EXISTS idx_player_achievements_player ON player_achievements(player_id)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_player_achievements_achievement ON player_achievements(achievement_id)').run();

  // Commit transaction
  db.prepare('COMMIT').run();

  console.log('✅ Migration completed successfully!');

  // Verify new structure
  const newTableInfo = db.prepare('PRAGMA table_info(player_achievements)').all();
  console.log('New columns:', (newTableInfo as any[]).map((col: any) => col.name).join(', '));

} catch (error) {
  console.error('❌ Migration failed:', error);
  db.prepare('ROLLBACK').run();
  process.exit(1);
} finally {
  db.close();
}
