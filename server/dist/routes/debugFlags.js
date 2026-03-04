"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uuid_1 = require("uuid");
const database_1 = require("../database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
/**
 * Middleware to check if user is admin
 */
const requireAdmin = (req, res, next) => {
    const db = (0, database_1.getDatabase)();
    const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user?.id);
    if (!user || !user.is_admin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};
// All routes require authentication + admin
router.use(auth_1.authenticateToken);
router.use(requireAdmin);
/**
 * POST / - Create a new debug flag
 */
router.post('/', (req, res) => {
    const { comment, route, browserInfo, screenshotUrl, gameState, logEntries } = req.body;
    if (!comment) {
        return res.status(400).json({ error: 'Comment is required' });
    }
    const db = (0, database_1.getDatabase)();
    try {
        const flagId = (0, uuid_1.v4)();
        const now = Date.now();
        db.prepare(`
      INSERT INTO debug_flags (
        id, user_id, comment, route, browser_info, screenshot_url,
        game_state, log_entries, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(flagId, req.user?.id, comment, route || null, browserInfo ? JSON.stringify(browserInfo) : null, screenshotUrl || null, gameState ? JSON.stringify(gameState) : null, JSON.stringify(logEntries || []), 'open', now, now);
        res.status(201).json({
            id: flagId,
            message: 'Debug flag created successfully',
        });
    }
    catch (error) {
        console.error('Create debug flag error:', error);
        res.status(500).json({ error: 'Failed to create debug flag' });
    }
});
/**
 * GET / - Get all debug flags (filterable by ?status=)
 */
router.get('/', (req, res) => {
    const db = (0, database_1.getDatabase)();
    const { status } = req.query;
    try {
        let query = `
      SELECT
        df.id, df.user_id, df.comment, df.route, df.browser_info,
        df.screenshot_url, df.game_state, df.log_entries, df.status,
        df.admin_notes, df.created_at, df.updated_at, df.resolved_at,
        u.name as user_name, u.email as user_email
      FROM debug_flags df
      LEFT JOIN users u ON df.user_id = u.id
      WHERE 1=1
    `;
        const params = [];
        if (status && typeof status === 'string') {
            query += ' AND df.status = ?';
            params.push(status);
        }
        query += ' ORDER BY df.created_at DESC';
        const flags = db.prepare(query).all(...params);
        const formatted = flags.map(f => ({
            id: f.id,
            userId: f.user_id,
            userName: f.user_name,
            userEmail: f.user_email,
            comment: f.comment,
            route: f.route,
            browserInfo: f.browser_info ? JSON.parse(f.browser_info) : null,
            screenshotUrl: f.screenshot_url,
            gameState: f.game_state ? JSON.parse(f.game_state) : null,
            logEntries: f.log_entries ? JSON.parse(f.log_entries) : [],
            status: f.status,
            adminNotes: f.admin_notes,
            createdAt: f.created_at,
            updatedAt: f.updated_at,
            resolvedAt: f.resolved_at,
        }));
        res.json(formatted);
    }
    catch (error) {
        console.error('Get debug flags error:', error);
        res.status(500).json({ error: 'Failed to fetch debug flags' });
    }
});
/**
 * GET /:id - Get a single debug flag
 */
router.get('/:id', (req, res) => {
    const { id } = req.params;
    const db = (0, database_1.getDatabase)();
    try {
        const flag = db.prepare(`
      SELECT
        df.id, df.user_id, df.comment, df.route, df.browser_info,
        df.screenshot_url, df.game_state, df.log_entries, df.status,
        df.admin_notes, df.created_at, df.updated_at, df.resolved_at,
        u.name as user_name, u.email as user_email
      FROM debug_flags df
      LEFT JOIN users u ON df.user_id = u.id
      WHERE df.id = ?
    `).get(id);
        if (!flag) {
            return res.status(404).json({ error: 'Debug flag not found' });
        }
        res.json({
            id: flag.id,
            userId: flag.user_id,
            userName: flag.user_name,
            userEmail: flag.user_email,
            comment: flag.comment,
            route: flag.route,
            browserInfo: flag.browser_info ? JSON.parse(flag.browser_info) : null,
            screenshotUrl: flag.screenshot_url,
            gameState: flag.game_state ? JSON.parse(flag.game_state) : null,
            logEntries: flag.log_entries ? JSON.parse(flag.log_entries) : [],
            status: flag.status,
            adminNotes: flag.admin_notes,
            createdAt: flag.created_at,
            updatedAt: flag.updated_at,
            resolvedAt: flag.resolved_at,
        });
    }
    catch (error) {
        console.error('Get debug flag error:', error);
        res.status(500).json({ error: 'Failed to fetch debug flag' });
    }
});
/**
 * PATCH /:id/status - Update debug flag status
 */
router.patch('/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
        return res.status(400).json({ error: 'Status is required' });
    }
    const validStatuses = ['open', 'investigating', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    const db = (0, database_1.getDatabase)();
    try {
        const flag = db.prepare('SELECT * FROM debug_flags WHERE id = ?').get(id);
        if (!flag) {
            return res.status(404).json({ error: 'Debug flag not found' });
        }
        const now = Date.now();
        const resolvedAt = (status === 'resolved' || status === 'dismissed') ? now : null;
        db.prepare(`
      UPDATE debug_flags
      SET status = ?, updated_at = ?, resolved_at = ?
      WHERE id = ?
    `).run(status, now, resolvedAt, id);
        res.json({ message: 'Status updated successfully' });
    }
    catch (error) {
        console.error('Update debug flag status error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});
/**
 * PATCH /:id/notes - Update admin notes
 */
router.patch('/:id/notes', (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;
    const db = (0, database_1.getDatabase)();
    try {
        const flag = db.prepare('SELECT * FROM debug_flags WHERE id = ?').get(id);
        if (!flag) {
            return res.status(404).json({ error: 'Debug flag not found' });
        }
        db.prepare(`
      UPDATE debug_flags
      SET admin_notes = ?, updated_at = ?
      WHERE id = ?
    `).run(notes || null, Date.now(), id);
        res.json({ message: 'Admin notes updated successfully' });
    }
    catch (error) {
        console.error('Update debug flag notes error:', error);
        res.status(500).json({ error: 'Failed to update notes' });
    }
});
/**
 * DELETE /:id - Delete a debug flag
 */
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const db = (0, database_1.getDatabase)();
    try {
        const flag = db.prepare('SELECT * FROM debug_flags WHERE id = ?').get(id);
        if (!flag) {
            return res.status(404).json({ error: 'Debug flag not found' });
        }
        db.prepare('DELETE FROM debug_flags WHERE id = ?').run(id);
        res.json({ message: 'Debug flag deleted successfully' });
    }
    catch (error) {
        console.error('Delete debug flag error:', error);
        res.status(500).json({ error: 'Failed to delete debug flag' });
    }
});
exports.default = router;
//# sourceMappingURL=debugFlags.js.map