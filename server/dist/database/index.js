"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDatabase = exports.getDatabase = exports.initDatabase = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("../config");
const schema_1 = require("./schema");
let db = null;
const initDatabase = () => {
    if (db)
        return db;
    // Ensure data directory exists
    const dataDir = path_1.default.dirname(config_1.config.databasePath);
    if (!fs_1.default.existsSync(dataDir)) {
        fs_1.default.mkdirSync(dataDir, { recursive: true });
    }
    // Initialize database
    db = new better_sqlite3_1.default(config_1.config.databasePath);
    db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better performance
    db.pragma('foreign_keys = ON'); // Enable foreign key constraints
    // Execute schema
    db.exec(schema_1.schema);
    // Seed default achievements if empty
    const achievementCount = db.prepare('SELECT COUNT(*) as count FROM achievements').get();
    if (achievementCount.count === 0) {
        const insertAchievement = db.prepare(`
      INSERT INTO achievements (id, name, description, icon, category, points, rarity, target)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const seedAchievements = db.transaction(() => {
            for (const achievement of schema_1.defaultAchievements) {
                insertAchievement.run(achievement.id, achievement.name, achievement.description, achievement.icon, achievement.category, achievement.points, achievement.rarity, achievement.target || null);
            }
        });
        seedAchievements();
        console.log(`✅ Seeded ${schema_1.defaultAchievements.length} default achievements`);
    }
    // Schedule periodic WAL checkpoint to prevent corruption
    // Runs every 5 minutes to ensure WAL data is written to main DB
    setInterval(() => {
        if (db) {
            try {
                db.pragma('wal_checkpoint(PASSIVE)');
            }
            catch (err) {
                console.error('WAL checkpoint failed:', err);
            }
        }
    }, 5 * 60 * 1000);
    console.log('✅ Database initialized successfully');
    return db;
};
exports.initDatabase = initDatabase;
const getDatabase = () => {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
};
exports.getDatabase = getDatabase;
const closeDatabase = () => {
    if (db) {
        // Final checkpoint before closing to ensure all WAL data is written
        try {
            db.pragma('wal_checkpoint(TRUNCATE)');
        }
        catch (err) {
            console.error('Final WAL checkpoint failed:', err);
        }
        db.close();
        db = null;
        console.log('✅ Database connection closed');
    }
};
exports.closeDatabase = closeDatabase;
// Graceful shutdown
process.on('SIGINT', () => {
    (0, exports.closeDatabase)();
    process.exit(0);
});
process.on('SIGTERM', () => {
    (0, exports.closeDatabase)();
    process.exit(0);
});
//# sourceMappingURL=index.js.map