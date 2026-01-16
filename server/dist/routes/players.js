"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get all players for tenant
router.get('/', auth_1.authenticateTenant, (req, res) => {
    const db = (0, database_1.getDatabase)();
    try {
        const rawPlayers = db.prepare(`
      SELECT p.*, ps.*
      FROM players p
      LEFT JOIN player_stats ps ON p.id = ps.player_id
      WHERE p.tenant_id = ?
      ORDER BY p.created_at DESC
    `).all(req.tenantId);
        // Transform flat structure to nested structure
        const players = rawPlayers.map((row) => ({
            id: row.id,
            name: row.name,
            avatar: row.avatar,
            createdAt: row.created_at,
            stats: {
                gamesPlayed: row.games_played || 0,
                gamesWon: row.games_won || 0,
                totalLegsPlayed: row.total_legs_played || 0,
                totalLegsWon: row.total_legs_won || 0,
                highestCheckout: row.highest_checkout || 0,
                total180s: row.total_180s || 0,
                total171Plus: row.total_171_plus || 0,
                total140Plus: row.total_140_plus || 0,
                total100Plus: row.total_100_plus || 0,
                total60Plus: row.total_60_plus || 0,
                bestAverage: row.best_average || 0,
                averageOverall: row.average_overall || 0,
                checkoutPercentage: row.checkout_percentage || 0,
                checkoutsByDouble: {},
                scoreDistribution: {},
                bestLeg: row.best_leg || 999,
                nineDartFinishes: row.nine_dart_finishes || 0,
            },
            preferences: {
                preferredCheckouts: {},
                soundEnabled: true,
                callerLanguage: 'en',
                callerVoice: 'male',
                vibrationEnabled: true,
            }
        }));
        res.json({ players });
    }
    catch (error) {
        console.error('Error fetching players:', error);
        res.status(500).json({ error: 'Failed to fetch players' });
    }
});
// Get single player
router.get('/:id', auth_1.authenticateTenant, (req, res) => {
    const { id } = req.params;
    const db = (0, database_1.getDatabase)();
    try {
        const row = db.prepare(`
      SELECT p.*, ps.*
      FROM players p
      LEFT JOIN player_stats ps ON p.id = ps.player_id
      WHERE p.id = ? AND p.tenant_id = ?
    `).get(id, req.tenantId);
        if (!row) {
            return res.status(404).json({ error: 'Player not found' });
        }
        // Transform flat structure to nested structure
        const player = {
            id: row.id,
            name: row.name,
            avatar: row.avatar,
            createdAt: row.created_at,
            stats: {
                gamesPlayed: row.games_played || 0,
                gamesWon: row.games_won || 0,
                totalLegsPlayed: row.total_legs_played || 0,
                totalLegsWon: row.total_legs_won || 0,
                highestCheckout: row.highest_checkout || 0,
                total180s: row.total_180s || 0,
                total171Plus: row.total_171_plus || 0,
                total140Plus: row.total_140_plus || 0,
                total100Plus: row.total_100_plus || 0,
                total60Plus: row.total_60_plus || 0,
                bestAverage: row.best_average || 0,
                averageOverall: row.average_overall || 0,
                checkoutPercentage: row.checkout_percentage || 0,
                checkoutsByDouble: {},
                scoreDistribution: {},
                bestLeg: row.best_leg || 999,
                nineDartFinishes: row.nine_dart_finishes || 0,
            },
            preferences: {
                preferredCheckouts: {},
                soundEnabled: true,
                callerLanguage: 'en',
                callerVoice: 'male',
                vibrationEnabled: true,
            }
        };
        res.json(player);
    }
    catch (error) {
        console.error('Error fetching player:', error);
        res.status(500).json({ error: 'Failed to fetch player' });
    }
});
// Create player
router.post('/', auth_1.authenticateTenant, (req, res) => {
    const { id, name, avatar } = req.body;
    if (!id || !name) {
        return res.status(400).json({ error: 'id and name are required' });
    }
    const db = (0, database_1.getDatabase)();
    try {
        // Insert player
        db.prepare(`
      INSERT INTO players (id, tenant_id, name, avatar, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, req.tenantId, name, avatar || name.charAt(0).toUpperCase(), Date.now());
        // Initialize stats
        db.prepare(`
      INSERT INTO player_stats (player_id)
      VALUES (?)
    `).run(id);
        const row = db.prepare(`
      SELECT p.*, ps.*
      FROM players p
      LEFT JOIN player_stats ps ON p.id = ps.player_id
      WHERE p.id = ?
    `).get(id);
        // Transform to nested structure
        const player = {
            id: row.id,
            name: row.name,
            avatar: row.avatar,
            createdAt: row.created_at,
            stats: {
                gamesPlayed: row.games_played || 0,
                gamesWon: row.games_won || 0,
                totalLegsPlayed: row.total_legs_played || 0,
                totalLegsWon: row.total_legs_won || 0,
                highestCheckout: row.highest_checkout || 0,
                total180s: row.total_180s || 0,
                total171Plus: row.total_171_plus || 0,
                total140Plus: row.total_140_plus || 0,
                total100Plus: row.total_100_plus || 0,
                total60Plus: row.total_60_plus || 0,
                bestAverage: row.best_average || 0,
                averageOverall: row.average_overall || 0,
                checkoutPercentage: row.checkout_percentage || 0,
                checkoutsByDouble: {},
                scoreDistribution: {},
                bestLeg: row.best_leg || 999,
                nineDartFinishes: row.nine_dart_finishes || 0,
            },
            preferences: {
                preferredCheckouts: {},
                soundEnabled: true,
                callerLanguage: 'en',
                callerVoice: 'male',
                vibrationEnabled: true,
            }
        };
        res.status(201).json({ player });
    }
    catch (error) {
        console.error('Error creating player:', error);
        res.status(500).json({ error: 'Failed to create player' });
    }
});
// Update player
router.put('/:id', auth_1.authenticateTenant, (req, res) => {
    const { id } = req.params;
    const { name, avatar } = req.body;
    const db = (0, database_1.getDatabase)();
    try {
        // Verify ownership
        const player = db.prepare('SELECT * FROM players WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        // Update player
        db.prepare('UPDATE players SET name = ?, avatar = ? WHERE id = ?').run(name, avatar, id);
        const updatedPlayer = db.prepare(`
      SELECT p.*, ps.*
      FROM players p
      LEFT JOIN player_stats ps ON p.id = ps.player_id
      WHERE p.id = ?
    `).get(id);
        res.json(updatedPlayer);
    }
    catch (error) {
        console.error('Error updating player:', error);
        res.status(500).json({ error: 'Failed to update player' });
    }
});
// Delete player
router.delete('/:id', auth_1.authenticateTenant, (req, res) => {
    const { id } = req.params;
    const db = (0, database_1.getDatabase)();
    try {
        // Verify ownership
        const player = db.prepare('SELECT * FROM players WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        // Delete player (cascades to stats, etc.)
        db.prepare('DELETE FROM players WHERE id = ?').run(id);
        res.json({ message: 'Player deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting player:', error);
        res.status(500).json({ error: 'Failed to delete player' });
    }
});
// Get player heatmap
router.get('/:id/heatmap', auth_1.authenticateTenant, (req, res) => {
    const { id } = req.params;
    const db = (0, database_1.getDatabase)();
    try {
        // Verify ownership
        const player = db.prepare('SELECT * FROM players WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        const heatmap = db.prepare('SELECT * FROM heatmap_data WHERE player_id = ?').get(id);
        if (!heatmap) {
            return res.json({
                player_id: id,
                segments: {},
                total_darts: 0,
                last_updated: Date.now(),
            });
        }
        return res.json({
            ...heatmap,
            segments: JSON.parse(heatmap.segments),
        });
    }
    catch (error) {
        console.error('Error fetching heatmap:', error);
        res.status(500).json({ error: 'Failed to fetch heatmap' });
    }
});
// Get all heatmaps for tenant (batch)
router.get('/heatmaps/batch', auth_1.authenticateTenant, (req, res) => {
    const db = (0, database_1.getDatabase)();
    try {
        // Get all players for this tenant
        const players = db.prepare('SELECT id FROM players WHERE tenant_id = ?').all(req.tenantId);
        const playerIds = players.map(p => p.id);
        if (playerIds.length === 0) {
            return res.json({ heatmaps: {} });
        }
        // Get all heatmaps in one query
        const placeholders = playerIds.map(() => '?').join(',');
        const heatmaps = db.prepare(`SELECT * FROM heatmap_data WHERE player_id IN (${placeholders})`).all(...playerIds);
        // Format response
        const heatmapMap = {};
        heatmaps.forEach(heatmap => {
            heatmapMap[heatmap.player_id] = {
                player_id: heatmap.player_id,
                segments: JSON.parse(heatmap.segments),
                total_darts: heatmap.total_darts,
                last_updated: heatmap.last_updated,
            };
        });
        // Add empty heatmaps for players without data
        playerIds.forEach(id => {
            if (!heatmapMap[id]) {
                heatmapMap[id] = {
                    player_id: id,
                    segments: {},
                    total_darts: 0,
                    last_updated: Date.now(),
                };
            }
        });
        res.json({ heatmaps: heatmapMap });
    }
    catch (error) {
        console.error('Error fetching batch heatmaps:', error);
        res.status(500).json({ error: 'Failed to fetch heatmaps' });
    }
});
// Update player heatmap
router.post('/:id/heatmap', auth_1.authenticateTenant, (req, res) => {
    const { id } = req.params;
    const { segments, total_darts, totalDarts } = req.body;
    // Accept both camelCase and snake_case
    const dartsCount = total_darts !== undefined ? total_darts : totalDarts;
    if (!segments || dartsCount === undefined) {
        return res.status(400).json({ error: 'segments and total_darts/totalDarts are required' });
    }
    const db = (0, database_1.getDatabase)();
    try {
        // Verify ownership
        const player = db.prepare('SELECT * FROM players WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        // Upsert heatmap
        db.prepare(`
      INSERT INTO heatmap_data (player_id, segments, total_darts, last_updated)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(player_id) DO UPDATE SET
        segments = excluded.segments,
        total_darts = excluded.total_darts,
        last_updated = excluded.last_updated
    `).run(id, JSON.stringify(segments), dartsCount, Date.now());
        res.json({ message: 'Heatmap updated successfully' });
    }
    catch (error) {
        console.error('Error updating heatmap:', error);
        res.status(500).json({ error: 'Failed to update heatmap' });
    }
});
// Get player personal bests
router.get('/:id/personal-bests', auth_1.authenticateTenant, (req, res) => {
    const { id } = req.params;
    const db = (0, database_1.getDatabase)();
    try {
        // Verify ownership
        const player = db.prepare('SELECT * FROM players WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        const personalBests = db.prepare('SELECT * FROM personal_bests WHERE player_id = ?').get(id);
        if (!personalBests) {
            return res.json({
                player_id: id,
                data: {},
                last_updated: Date.now(),
            });
        }
        return res.json({
            ...personalBests,
            data: JSON.parse(personalBests.data),
        });
    }
    catch (error) {
        console.error('Error fetching personal bests:', error);
        res.status(500).json({ error: 'Failed to fetch personal bests' });
    }
});
// Update player personal bests
router.post('/:id/personal-bests', auth_1.authenticateTenant, (req, res) => {
    const { id } = req.params;
    const { data } = req.body;
    if (!data) {
        return res.status(400).json({ error: 'data is required' });
    }
    const db = (0, database_1.getDatabase)();
    try {
        // Verify ownership
        const player = db.prepare('SELECT * FROM players WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        // Upsert personal bests
        db.prepare(`
      INSERT INTO personal_bests (player_id, data, last_updated)
      VALUES (?, ?, ?)
      ON CONFLICT(player_id) DO UPDATE SET
        data = excluded.data,
        last_updated = excluded.last_updated
    `).run(id, JSON.stringify(data), Date.now());
        res.json({ message: 'Personal bests updated successfully' });
    }
    catch (error) {
        console.error('Error updating personal bests:', error);
        res.status(500).json({ error: 'Failed to update personal bests' });
    }
});
exports.default = router;
//# sourceMappingURL=players.js.map