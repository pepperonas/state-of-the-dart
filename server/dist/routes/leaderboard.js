"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../database");
const router = express_1.default.Router();
/**
 * Get global leaderboard
 * Query params:
 * - metric: 'average' | 'wins' | '180s' | 'checkouts' | 'highest_score'
 * - limit: number (default 100)
 */
router.get('/', (req, res) => {
    const metric = req.query.metric || 'average';
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const db = (0, database_1.getDatabase)();
    try {
        let query = '';
        let orderBy = '';
        switch (metric) {
            case 'average':
                query = `
          SELECT 
            p.id as playerId,
            p.name as playerName,
            p.avatar as playerAvatar,
            u.name as userName,
            u.avatar as userAvatar,
            CAST(ps.average_overall as REAL) as value,
            ps.games_played as gamesPlayed
          FROM players p
          INNER JOIN tenants t ON p.tenant_id = t.id
          INNER JOIN users u ON t.user_id = u.id
          INNER JOIN player_stats ps ON p.id = ps.player_id
          WHERE ps.games_played >= 5
        `;
                orderBy = 'ORDER BY ps.average_overall DESC';
                break;
            case 'wins':
                query = `
          SELECT 
            p.id as playerId,
            p.name as playerName,
            p.avatar as playerAvatar,
            u.name as userName,
            u.avatar as userAvatar,
            CAST(ps.games_won as INTEGER) as value,
            ps.games_played as gamesPlayed
          FROM players p
          INNER JOIN tenants t ON p.tenant_id = t.id
          INNER JOIN users u ON t.user_id = u.id
          INNER JOIN player_stats ps ON p.id = ps.player_id
          WHERE ps.games_played >= 1
        `;
                orderBy = 'ORDER BY ps.games_won DESC';
                break;
            case '180s':
                query = `
          SELECT 
            p.id as playerId,
            p.name as playerName,
            p.avatar as playerAvatar,
            u.name as userName,
            u.avatar as userAvatar,
            CAST(ps.total_180s as INTEGER) as value,
            ps.games_played as gamesPlayed
          FROM players p
          INNER JOIN tenants t ON p.tenant_id = t.id
          INNER JOIN users u ON t.user_id = u.id
          INNER JOIN player_stats ps ON p.id = ps.player_id
          WHERE ps.total_180s > 0
        `;
                orderBy = 'ORDER BY ps.total_180s DESC';
                break;
            case 'checkouts':
                query = `
          SELECT 
            p.id as playerId,
            p.name as playerName,
            p.avatar as playerAvatar,
            u.name as userName,
            u.avatar as userAvatar,
            CAST(ps.highest_checkout as INTEGER) as value,
            ps.games_played as gamesPlayed
          FROM players p
          INNER JOIN tenants t ON p.tenant_id = t.id
          INNER JOIN users u ON t.user_id = u.id
          INNER JOIN player_stats ps ON p.id = ps.player_id
          WHERE ps.highest_checkout > 0
        `;
                orderBy = 'ORDER BY ps.highest_checkout DESC';
                break;
            case 'best_leg':
                query = `
          SELECT 
            p.id as playerId,
            p.name as playerName,
            p.avatar as playerAvatar,
            u.name as userName,
            u.avatar as userAvatar,
            CAST(ps.best_leg as INTEGER) as value,
            ps.games_played as gamesPlayed
          FROM players p
          INNER JOIN tenants t ON p.tenant_id = t.id
          INNER JOIN users u ON t.user_id = u.id
          INNER JOIN player_stats ps ON p.id = ps.player_id
          WHERE ps.best_leg < 999
        `;
                orderBy = 'ORDER BY ps.best_leg ASC'; // Lower is better
                break;
            default:
                return res.status(400).json({ error: 'Invalid metric' });
        }
        const results = db.prepare(`${query} ${orderBy} LIMIT ?`).all(limit);
        // Add rank
        const leaderboard = results.map((row, index) => ({
            playerId: row.playerId,
            playerName: row.playerName,
            playerAvatar: row.playerAvatar || '👤',
            userName: row.userName,
            userAvatar: row.userAvatar || '👤',
            value: row.value,
            rank: index + 1,
            gamesPlayed: row.gamesPlayed,
        }));
        res.json({
            metric,
            entries: leaderboard,
            total: leaderboard.length,
        });
    }
    catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
});
exports.default = router;
//# sourceMappingURL=leaderboard.js.map