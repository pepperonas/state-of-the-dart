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
        const achievements = db.prepare(`
      SELECT pa.*, a.name, a.description, a.icon, a.category, a.points, a.rarity, a.target
      FROM player_achievements pa
      JOIN achievements a ON pa.achievement_id = a.id
      WHERE pa.player_id = ?
      ORDER BY pa.unlocked_at DESC
    `).all(playerId);
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
    if (!achievementId) {
        return res.status(400).json({ error: 'achievementId is required' });
    }
    const db = (0, database_1.getDatabase)();
    try {
        // Check if achievement exists
        const achievement = db.prepare('SELECT * FROM achievements WHERE id = ?').get(achievementId);
        if (!achievement) {
            return res.status(404).json({ error: 'Achievement not found' });
        }
        // Unlock achievement
        db.prepare(`
      INSERT OR REPLACE INTO player_achievements (id, player_id, achievement_id, unlocked_at, progress)
      VALUES (?, ?, ?, ?, ?)
    `).run(`${playerId}-${achievementId}`, playerId, achievementId, Date.now(), progress || 100);
        res.json({ message: 'Achievement unlocked successfully' });
    }
    catch (error) {
        console.error('Error unlocking achievement:', error);
        res.status(500).json({ error: 'Failed to unlock achievement' });
    }
});
// Update achievement progress
router.put('/player/:playerId/progress', auth_1.authenticateTenant, (req, res) => {
    const { playerId } = req.params;
    const { achievementId, progress } = req.body;
    if (!achievementId || progress === undefined) {
        return res.status(400).json({ error: 'achievementId and progress are required' });
    }
    const db = (0, database_1.getDatabase)();
    try {
        // Upsert progress
        db.prepare(`
      INSERT OR REPLACE INTO player_achievements (id, player_id, achievement_id, unlocked_at, progress)
      VALUES (?, ?, ?, ?, ?)
    `).run(`${playerId}-${achievementId}`, playerId, achievementId, Date.now(), progress);
        res.json({ message: 'Achievement progress updated successfully' });
    }
    catch (error) {
        console.error('Error updating achievement progress:', error);
        res.status(500).json({ error: 'Failed to update achievement progress' });
    }
});
exports.default = router;
//# sourceMappingURL=achievements.js.map