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
// Apply authentication to all routes
router.use(auth_1.authenticateToken);
/**
 * GET / - Get all bug reports
 * Admin: sees all reports
 * User: sees only their own reports
 */
router.get('/', (req, res) => {
    const db = (0, database_1.getDatabase)();
    const { status, severity } = req.query;
    try {
        const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user?.id);
        const isAdmin = user?.is_admin === 1;
        let query = `
      SELECT
        br.id, br.user_id, br.title, br.description, br.severity, br.category,
        br.status, br.screenshot_url, br.browser_info, br.route, br.admin_notes,
        br.created_at, br.updated_at, br.resolved_at,
        u.name as user_name, u.email as user_email
      FROM bug_reports br
      LEFT JOIN users u ON br.user_id = u.id
      WHERE 1=1
    `;
        const params = [];
        // Filter by user if not admin
        if (!isAdmin) {
            query += ' AND br.user_id = ?';
            params.push(req.user?.id);
        }
        // Filter by status
        if (status && typeof status === 'string') {
            query += ' AND br.status = ?';
            params.push(status);
        }
        // Filter by severity
        if (severity && typeof severity === 'string') {
            query += ' AND br.severity = ?';
            params.push(severity);
        }
        query += ' ORDER BY br.created_at DESC';
        const reports = db.prepare(query).all(...params);
        // Parse browser_info JSON
        const formattedReports = reports.map(report => ({
            id: report.id,
            userId: report.user_id,
            userName: report.user_name,
            userEmail: report.user_email,
            title: report.title,
            description: report.description,
            severity: report.severity,
            category: report.category,
            status: report.status,
            screenshotUrl: report.screenshot_url,
            browserInfo: report.browser_info ? JSON.parse(report.browser_info) : null,
            route: report.route,
            adminNotes: report.admin_notes,
            createdAt: new Date(report.created_at),
            updatedAt: new Date(report.updated_at),
            resolvedAt: report.resolved_at ? new Date(report.resolved_at) : null,
        }));
        res.json(formattedReports);
    }
    catch (error) {
        console.error('Get bug reports error:', error);
        res.status(500).json({ error: 'Failed to fetch bug reports' });
    }
});
/**
 * POST / - Create new bug report
 */
router.post('/', (req, res) => {
    const { title, description, severity, category, screenshotUrl, browserInfo, route } = req.body;
    if (!title || !description || !severity || !category) {
        return res.status(400).json({ error: 'Title, description, severity, and category are required' });
    }
    // Validate severity
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(severity)) {
        return res.status(400).json({ error: 'Invalid severity level' });
    }
    // Validate category
    const validCategories = ['gameplay', 'ui', 'audio', 'performance', 'auth', 'data', 'other'];
    if (!validCategories.includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
    }
    const db = (0, database_1.getDatabase)();
    try {
        const reportId = (0, uuid_1.v4)();
        const now = Date.now();
        db.prepare(`
      INSERT INTO bug_reports (
        id, user_id, title, description, severity, category, status,
        screenshot_url, browser_info, route, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(reportId, req.user?.id, title, description, severity, category, 'open', screenshotUrl || null, browserInfo ? JSON.stringify(browserInfo) : null, route || null, now, now);
        res.status(201).json({
            id: reportId,
            message: 'Bug report created successfully',
        });
    }
    catch (error) {
        console.error('Create bug report error:', error);
        res.status(500).json({ error: 'Failed to create bug report' });
    }
});
/**
 * GET /:id - Get single bug report
 */
router.get('/:id', (req, res) => {
    const { id } = req.params;
    const db = (0, database_1.getDatabase)();
    try {
        const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user?.id);
        const isAdmin = user?.is_admin === 1;
        let query = `
      SELECT
        br.id, br.user_id, br.title, br.description, br.severity, br.category,
        br.status, br.screenshot_url, br.browser_info, br.route, br.admin_notes,
        br.created_at, br.updated_at, br.resolved_at,
        u.name as user_name, u.email as user_email
      FROM bug_reports br
      LEFT JOIN users u ON br.user_id = u.id
      WHERE br.id = ?
    `;
        const params = [id];
        // Non-admin users can only view their own reports
        if (!isAdmin) {
            query += ' AND br.user_id = ?';
            params.push(req.user?.id);
        }
        const report = db.prepare(query).get(...params);
        if (!report) {
            return res.status(404).json({ error: 'Bug report not found' });
        }
        const formattedReport = {
            id: report.id,
            userId: report.user_id,
            userName: report.user_name,
            userEmail: report.user_email,
            title: report.title,
            description: report.description,
            severity: report.severity,
            category: report.category,
            status: report.status,
            screenshotUrl: report.screenshot_url,
            browserInfo: report.browser_info ? JSON.parse(report.browser_info) : null,
            route: report.route,
            adminNotes: report.admin_notes,
            createdAt: new Date(report.created_at),
            updatedAt: new Date(report.updated_at),
            resolvedAt: report.resolved_at ? new Date(report.resolved_at) : null,
        };
        res.json(formattedReport);
    }
    catch (error) {
        console.error('Get bug report error:', error);
        res.status(500).json({ error: 'Failed to fetch bug report' });
    }
});
/**
 * PATCH /:id/status - Update bug report status (Admin only)
 */
router.patch('/:id/status', requireAdmin, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
        return res.status(400).json({ error: 'Status is required' });
    }
    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    const db = (0, database_1.getDatabase)();
    try {
        const report = db.prepare('SELECT * FROM bug_reports WHERE id = ?').get(id);
        if (!report) {
            return res.status(404).json({ error: 'Bug report not found' });
        }
        const now = Date.now();
        const resolvedAt = (status === 'resolved' || status === 'closed') ? now : null;
        db.prepare(`
      UPDATE bug_reports
      SET status = ?, updated_at = ?, resolved_at = ?
      WHERE id = ?
    `).run(status, now, resolvedAt, id);
        res.json({ message: 'Status updated successfully' });
    }
    catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});
/**
 * PATCH /:id/notes - Update admin notes (Admin only)
 */
router.patch('/:id/notes', requireAdmin, (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;
    const db = (0, database_1.getDatabase)();
    try {
        const report = db.prepare('SELECT * FROM bug_reports WHERE id = ?').get(id);
        if (!report) {
            return res.status(404).json({ error: 'Bug report not found' });
        }
        db.prepare(`
      UPDATE bug_reports
      SET admin_notes = ?, updated_at = ?
      WHERE id = ?
    `).run(notes || null, Date.now(), id);
        res.json({ message: 'Admin notes updated successfully' });
    }
    catch (error) {
        console.error('Update notes error:', error);
        res.status(500).json({ error: 'Failed to update notes' });
    }
});
/**
 * DELETE /:id - Delete bug report (Admin only)
 */
router.delete('/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const db = (0, database_1.getDatabase)();
    try {
        const report = db.prepare('SELECT * FROM bug_reports WHERE id = ?').get(id);
        if (!report) {
            return res.status(404).json({ error: 'Bug report not found' });
        }
        db.prepare('DELETE FROM bug_reports WHERE id = ?').run(id);
        res.json({ message: 'Bug report deleted successfully' });
    }
    catch (error) {
        console.error('Delete bug report error:', error);
        res.status(500).json({ error: 'Failed to delete bug report' });
    }
});
exports.default = router;
//# sourceMappingURL=bugReports.js.map