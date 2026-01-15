"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get all training sessions for tenant
router.get('/', auth_1.authenticateTenant, (req, res) => {
    const { playerId, type, limit = '50' } = req.query;
    const db = (0, database_1.getDatabase)();
    try {
        let query = `SELECT * FROM training_sessions WHERE tenant_id = ?`;
        const params = [req.tenantId];
        if (playerId) {
            query += ` AND player_id = ?`;
            params.push(playerId);
        }
        if (type) {
            query += ` AND type = ?`;
            params.push(type);
        }
        query += ` ORDER BY started_at DESC LIMIT ?`;
        params.push(parseInt(limit));
        const sessions = db.prepare(query).all(...params);
        const parsedSessions = sessions.map((session) => ({
            ...session,
            settings: session.settings ? JSON.parse(session.settings) : {},
        }));
        res.json(parsedSessions);
    }
    catch (error) {
        console.error('Error fetching training sessions:', error);
        res.status(500).json({ error: 'Failed to fetch training sessions' });
    }
});
// Get single training session with results
router.get('/:id', auth_1.authenticateTenant, (req, res) => {
    const { id } = req.params;
    const db = (0, database_1.getDatabase)();
    try {
        const session = db.prepare('SELECT * FROM training_sessions WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
        if (!session) {
            return res.status(404).json({ error: 'Training session not found' });
        }
        const results = db.prepare('SELECT * FROM training_results WHERE session_id = ? ORDER BY timestamp ASC').all(id);
        const parsedResults = results.map((result) => ({
            ...result,
            darts_thrown: JSON.parse(result.darts_thrown),
        }));
        res.json({
            ...session,
            settings: session.settings ? JSON.parse(session.settings) : {},
            results: parsedResults,
        });
    }
    catch (error) {
        console.error('Error fetching training session:', error);
        res.status(500).json({ error: 'Failed to fetch training session' });
    }
});
// Create training session
router.post('/', auth_1.authenticateTenant, (req, res) => {
    const { id, playerId, type, startedAt, settings } = req.body;
    if (!id || !playerId || !type) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    const db = (0, database_1.getDatabase)();
    try {
        db.prepare(`
      INSERT INTO training_sessions (id, tenant_id, player_id, type, started_at, settings)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, req.tenantId, playerId, type, startedAt || Date.now(), JSON.stringify(settings || {}));
        res.status(201).json({ id, message: 'Training session created successfully' });
    }
    catch (error) {
        console.error('Error creating training session:', error);
        res.status(500).json({ error: 'Failed to create training session' });
    }
});
// Update training session
router.put('/:id', auth_1.authenticateTenant, (req, res) => {
    const { id } = req.params;
    const { completedAt, score, personalBest, totalDarts, totalHits, totalAttempts, hitRate, averageScore, highestScore, duration, results, } = req.body;
    const db = (0, database_1.getDatabase)();
    try {
        const session = db.prepare('SELECT * FROM training_sessions WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
        if (!session) {
            return res.status(404).json({ error: 'Training session not found' });
        }
        const updateSession = db.transaction(() => {
            // Update session
            db.prepare(`
        UPDATE training_sessions SET
          completed_at = ?,
          score = ?,
          personal_best = ?,
          total_darts = ?,
          total_hits = ?,
          total_attempts = ?,
          hit_rate = ?,
          average_score = ?,
          highest_score = ?,
          duration = ?
        WHERE id = ?
      `).run(completedAt, score, personalBest ? 1 : 0, totalDarts, totalHits, totalAttempts, hitRate, averageScore, highestScore, duration, id);
            // Insert results if provided
            if (results && Array.isArray(results)) {
                const insertResult = db.prepare(`
          INSERT INTO training_results (
            id, session_id, target_segment, target_multiplier,
            darts_thrown, hit, timestamp, score
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
                for (const result of results) {
                    insertResult.run(result.id || `${id}-${Date.now()}`, id, result.targetSegment, result.targetMultiplier, JSON.stringify(result.dartsThrown), result.hit ? 1 : 0, result.timestamp, result.score);
                }
            }
        });
        updateSession();
        res.json({ message: 'Training session updated successfully' });
    }
    catch (error) {
        console.error('Error updating training session:', error);
        res.status(500).json({ error: 'Failed to update training session' });
    }
});
// Delete training session
router.delete('/:id', auth_1.authenticateTenant, (req, res) => {
    const { id } = req.params;
    const db = (0, database_1.getDatabase)();
    try {
        const session = db.prepare('SELECT * FROM training_sessions WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
        if (!session) {
            return res.status(404).json({ error: 'Training session not found' });
        }
        db.prepare('DELETE FROM training_sessions WHERE id = ?').run(id);
        res.json({ message: 'Training session deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting training session:', error);
        res.status(500).json({ error: 'Failed to delete training session' });
    }
});
exports.default = router;
//# sourceMappingURL=training.js.map