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
// Get calendar stats for a player (for calendar-based achievements)
router.get('/player/:playerId/calendar-stats', auth_1.authenticateTenant, (req, res) => {
    const { playerId } = req.params;
    const db = (0, database_1.getDatabase)();
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayMs = todayStart.getTime();
        // Get distinct play days (days with completed matches)
        const playDays = db.prepare(`
      SELECT DISTINCT date(m.completed_at / 1000, 'unixepoch', 'localtime') as play_date
      FROM matches m
      JOIN match_players mp ON mp.match_id = m.id
      WHERE mp.player_id = ? AND m.status = 'completed' AND m.completed_at IS NOT NULL
      AND m.tenant_id = ?
      ORDER BY play_date DESC
    `).all(playerId, req.tenantId);
        // Get distinct win days
        const winDays = db.prepare(`
      SELECT DISTINCT date(m.completed_at / 1000, 'unixepoch', 'localtime') as win_date
      FROM matches m
      JOIN match_players mp ON mp.match_id = m.id
      WHERE mp.player_id = ? AND m.status = 'completed' AND m.winner = ?
      AND m.tenant_id = ?
      ORDER BY win_date DESC
    `).all(playerId, playerId, req.tenantId);
        // Get wins today
        const winsToday = db.prepare(`
      SELECT COUNT(*) as count FROM matches m
      JOIN match_players mp ON mp.match_id = m.id
      WHERE mp.player_id = ? AND m.status = 'completed' AND m.winner = ?
      AND m.completed_at >= ? AND m.tenant_id = ?
    `).get(playerId, playerId, todayMs, req.tenantId);
        // Get first game date
        const firstGame = db.prepare(`
      SELECT MIN(m.completed_at) as first_at FROM matches m
      JOIN match_players mp ON mp.match_id = m.id
      WHERE mp.player_id = ? AND m.status = 'completed' AND m.tenant_id = ?
    `).get(playerId, req.tenantId);
        // Calculate consecutive play day streak (from today backwards)
        let dailyPlayStreak = 0;
        if (playDays.length > 0) {
            const todayStr = todayStart.toISOString().split('T')[0];
            const playDateSet = new Set(playDays.map(d => d.play_date));
            const checkDate = new Date(todayStart);
            // If today has a match, start counting from today; otherwise check yesterday
            if (!playDateSet.has(todayStr)) {
                checkDate.setDate(checkDate.getDate() - 1);
            }
            while (true) {
                const dateStr = checkDate.toISOString().split('T')[0];
                if (playDateSet.has(dateStr)) {
                    dailyPlayStreak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                }
                else {
                    break;
                }
            }
        }
        // Get training days and today's training count
        const trainingDays = db.prepare(`
      SELECT DISTINCT date(completed_at / 1000, 'unixepoch', 'localtime') as train_date
      FROM training_sessions
      WHERE player_id = ? AND completed_at IS NOT NULL AND tenant_id = ?
      ORDER BY train_date DESC
    `).all(playerId, req.tenantId);
        const trainingsToday = db.prepare(`
      SELECT COUNT(*) as count FROM training_sessions
      WHERE player_id = ? AND completed_at >= ? AND tenant_id = ?
    `).get(playerId, todayMs, req.tenantId);
        // Calculate training day streak
        let dailyTrainingStreak = 0;
        if (trainingDays.length > 0) {
            const todayStr = todayStart.toISOString().split('T')[0];
            const trainDateSet = new Set(trainingDays.map(d => d.train_date));
            const checkDate = new Date(todayStart);
            if (!trainDateSet.has(todayStr)) {
                checkDate.setDate(checkDate.getDate() - 1);
            }
            while (true) {
                const dateStr = checkDate.toISOString().split('T')[0];
                if (trainDateSet.has(dateStr)) {
                    dailyTrainingStreak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                }
                else {
                    break;
                }
            }
        }
        // Win days this month
        const monthStart = new Date(todayStart);
        monthStart.setDate(1);
        const winDaysThisMonth = winDays.filter(d => d.win_date >= monthStart.toISOString().split('T')[0]).length;
        // Consecutive days with 3+ wins (check last 30 days)
        let dailyThreeWinsStreak = 0;
        {
            const checkDate = new Date(todayStart);
            for (let i = 0; i < 30; i++) {
                const dateStr = checkDate.toISOString().split('T')[0];
                const dayStart = new Date(dateStr + 'T00:00:00').getTime();
                const dayEnd = dayStart + 86400000;
                const dayWins = db.prepare(`
          SELECT COUNT(*) as count FROM matches m
          JOIN match_players mp ON mp.match_id = m.id
          WHERE mp.player_id = ? AND m.status = 'completed' AND m.winner = ?
          AND m.completed_at >= ? AND m.completed_at < ? AND m.tenant_id = ?
        `).get(playerId, playerId, dayStart, dayEnd, req.tenantId);
                if (dayWins.count >= 3) {
                    dailyThreeWinsStreak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                }
                else {
                    break;
                }
            }
        }
        // Days since first game
        const daysSinceFirstGame = firstGame.first_at
            ? Math.floor((Date.now() - firstGame.first_at) / 86400000)
            : 0;
        // Check if 100 wins were reached within 30 days
        // (find the 100th win's date, compare to first win's date)
        let wins100InDays = null;
        {
            const allWinDates = db.prepare(`
        SELECT m.completed_at FROM matches m
        JOIN match_players mp ON mp.match_id = m.id
        WHERE mp.player_id = ? AND m.status = 'completed' AND m.winner = ?
        AND m.tenant_id = ?
        ORDER BY m.completed_at ASC
        LIMIT 100
      `).all(playerId, playerId, req.tenantId);
            if (allWinDates.length >= 100) {
                const firstWinDate = allWinDates[0].completed_at;
                const hundredthWinDate = allWinDates[99].completed_at;
                wins100InDays = Math.ceil((hundredthWinDate - firstWinDate) / 86400000);
            }
        }
        // Game mode variety stats
        const gameModeCounts = db.prepare(`
      SELECT m.game_type,
             json_extract(m.settings, '$.startScore') as start_score,
             COUNT(*) as games,
             SUM(CASE WHEN m.winner = ? THEN 1 ELSE 0 END) as wins
      FROM matches m
      JOIN match_players mp ON mp.match_id = m.id
      WHERE mp.player_id = ? AND m.status = 'completed' AND m.tenant_id = ?
      GROUP BY m.game_type, start_score
    `).all(playerId, playerId, req.tenantId);
        // Distinct game types played
        const distinctGameTypes = new Set(gameModeCounts.map(r => r.game_type));
        // X01 variant wins: 301, 501, 701
        const x01Wins = {};
        const x01Games = {};
        for (const row of gameModeCounts) {
            if (row.game_type === 'x01' && row.start_score) {
                x01Wins[String(row.start_score)] = row.wins;
                x01Games[String(row.start_score)] = row.games;
            }
        }
        // Min wins across 301/501/701
        const minWinsAllModes = Math.min(x01Wins['301'] || 0, x01Wins['501'] || 0, x01Wins['701'] || 0);
        const minGamesAllModes = Math.min(x01Games['301'] || 0, x01Games['501'] || 0, x01Games['701'] || 0);
        // Training type stats (hit rates by mode)
        const trainingTypeStats = db.prepare(`
      SELECT type, MAX(hit_rate) as best_hit_rate, COUNT(*) as sessions
      FROM training_sessions
      WHERE player_id = ? AND completed_at IS NOT NULL AND tenant_id = ?
      GROUP BY type
    `).all(playerId, req.tenantId);
        const distinctTrainingTypes = trainingTypeStats.length;
        const minHitRateAllTraining = trainingTypeStats.length >= 6
            ? Math.min(...trainingTypeStats.map(t => t.best_hit_rate || 0))
            : 0;
        res.json({
            uniquePlayDays: playDays.length,
            uniqueWinDays: winDays.length,
            dailyPlayStreak,
            dailyTrainingStreak,
            daysSinceFirstGame,
            winsToday: winsToday.count,
            trainingsToday: trainingsToday.count,
            winDaysThisMonth,
            dailyThreeWinsStreak,
            wins100InDays,
            // Game mode variety
            distinctGameTypes: distinctGameTypes.size,
            minWinsAllModes,
            minGamesAllModes,
            // Training variety
            distinctTrainingTypes,
            minHitRateAllTraining,
        });
    }
    catch (error) {
        console.error('Error fetching calendar stats:', error);
        res.status(500).json({ error: 'Failed to fetch calendar stats' });
    }
});
exports.default = router;
//# sourceMappingURL=achievements.js.map