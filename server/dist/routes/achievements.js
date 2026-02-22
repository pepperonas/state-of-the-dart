"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get all achievements
router.get('/', (req, res) => {
    const db = (0, database_1.getDatabase)();
    try {
        const achievements = db.prepare('SELECT * FROM achievements ORDER BY points ASC').all();
        res.json(achievements);
    }
    catch (error) {
        console.error('Error fetching achievements:', error);
        res.status(500).json({ error: 'Failed to fetch achievements' });
    }
});
// Get player achievements
router.get('/player/:playerId', auth_1.authenticateTenant, (req, res) => {
    const { playerId } = req.params;
    const db = (0, database_1.getDatabase)();
    try {
        console.log(`[Achievements API] Fetching achievements for player ${playerId}, tenant ${req.tenantId}`);
        // No JOIN with legacy achievements table — achievement definitions are managed
        // by the frontend (247 achievements in src/types/achievements.ts)
        const achievements = db.prepare(`
      SELECT
        id,
        player_id,
        achievement_id,
        unlocked_at,
        progress,
        game_id
      FROM player_achievements
      WHERE player_id = ?
      ORDER BY unlocked_at DESC
    `).all(playerId);
        console.log(`[Achievements API] Found ${achievements.length} achievements for player ${playerId}`);
        res.json(achievements);
    }
    catch (error) {
        console.error('Error fetching player achievements:', error);
        res.status(500).json({ error: 'Failed to fetch player achievements' });
    }
});
// Unlock achievement for player
router.post('/player/:playerId/unlock', auth_1.authenticateTenant, (req, res) => {
    const { playerId } = req.params;
    const { achievementId, progress } = req.body;
    console.log(`[Achievements API] Unlock request for player ${playerId}, achievement ${achievementId}`);
    if (!achievementId) {
        console.warn(`[Achievements API] Unlock rejected: no achievementId provided`);
        return res.status(400).json({ error: 'achievementId is required' });
    }
    const db = (0, database_1.getDatabase)();
    try {
        // Check if player exists in database
        const playerExists = db.prepare('SELECT 1 FROM players WHERE id = ?').get(playerId);
        if (!playerExists) {
            console.log(`[Achievements API] Unlock skipped: player ${playerId} not in database`);
            return res.json({ message: 'Skipped - player not in database' });
        }
        // Achievement definitions are managed by the frontend (247 achievements).
        // We just store the unlock record without validating against the legacy achievements table.
        // Unlock achievement
        const unlockTime = Date.now();
        db.prepare(`
      INSERT OR REPLACE INTO player_achievements (id, player_id, achievement_id, unlocked_at, progress)
      VALUES (?, ?, ?, ?, ?)
    `).run(`${playerId}-${achievementId}`, playerId, achievementId, unlockTime, progress || 100);
        console.log(`[Achievements API] Achievement unlocked: ${achievementId} for player ${playerId} at ${unlockTime}`);
        res.json({ message: 'Achievement unlocked successfully', achievementId, unlockTime });
    }
    catch (error) {
        console.error('[Achievements API] Error unlocking achievement:', error);
        res.status(500).json({ error: 'Failed to unlock achievement' });
    }
});
// Update achievement progress
router.put('/player/:playerId/progress', auth_1.authenticateTenant, (req, res) => {
    const { playerId } = req.params;
    const { achievements } = req.body; // Frontend sends { achievements: { "achievement-id": { current, target, percentage } } }
    if (!achievements || typeof achievements !== 'object') {
        return res.status(400).json({ error: 'achievements object is required' });
    }
    const db = (0, database_1.getDatabase)();
    try {
        console.log(`[Achievements API] Updating progress for player ${playerId}:`, Object.keys(achievements).length, 'achievements');
        // Check if player exists in database before attempting to write
        const playerExists = db.prepare('SELECT 1 FROM players WHERE id = ?').get(playerId);
        if (!playerExists) {
            // Player not in DB (e.g. bot or local-only player) - silently skip
            return res.json({ message: 'Skipped - player not in database' });
        }
        // Process each achievement progress update
        // No validation against legacy achievements table — all 247 frontend achievement IDs are valid
        for (const [achievementId, progressData] of Object.entries(achievements)) {
            const progress = progressData.percentage || progressData.progress || 0;
            // Only update if not already unlocked (progress < 100)
            if (progress < 100) {
                // Don't overwrite already-unlocked achievements (unlocked_at IS NOT NULL)
                const existing = db.prepare('SELECT unlocked_at FROM player_achievements WHERE player_id = ? AND achievement_id = ?').get(playerId, achievementId);
                if (existing?.unlocked_at) {
                    // Already unlocked — skip progress update to avoid overwriting
                    continue;
                }
                db.prepare(`
          INSERT OR REPLACE INTO player_achievements (id, player_id, achievement_id, unlocked_at, progress)
          VALUES (?, ?, ?, ?, ?)
        `).run(`${playerId}-${achievementId}`, playerId, achievementId, null, // unlocked_at is null for progress updates (not unlocked yet)
                progress);
            }
        }
        res.json({ message: 'Achievement progress updated successfully' });
    }
    catch (error) {
        console.error('Error updating achievement progress:', error);
        res.status(500).json({ error: 'Failed to update achievement progress' });
    }
});
exports.default = router;
//# sourceMappingURL=achievements.js.map