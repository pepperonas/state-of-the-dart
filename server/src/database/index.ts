import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { schema, defaultAchievements } from './schema';

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
