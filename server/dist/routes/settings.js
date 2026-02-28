"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get user settings
router.get('/', auth_1.authenticateTenant, (req, res) => {
    const db = (0, database_1.getDatabase)();
    try {
        // Get settings for current user/tenant
        const settings = db.prepare(`
      SELECT * FROM user_settings 
      WHERE tenant_id = ?
    `).get(req.tenantId);
        if (!settings) {
            // Return default settings
            return res.json({
                tenant_id: req.tenantId,
                theme: 'dark',
                language: 'de',
                sound_enabled: true,
                caller_voice: 'john',
                caller_language: 'en',
                auto_next_player: true,
                show_checkout_suggestions: true,
                enable_achievements_hints: true,
                updated_at: Date.now()
            });
        }
        res.json(settings);
    }
    catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});
// Update user settings
router.put('/', auth_1.authenticateTenant, (req, res) => {
    const db = (0, database_1.getDatabase)();
    const settings = req.body;
    try {
        // Upsert settings
        const stmt = db.prepare(`
      INSERT INTO user_settings (
        tenant_id,
        theme,
        language,
        sound_enabled,
        caller_voice,
        caller_language,
        auto_next_player,
        show_checkout_suggestions,
        enable_achievements_hints,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(tenant_id) DO UPDATE SET
        theme = excluded.theme,
        language = excluded.language,
        sound_enabled = excluded.sound_enabled,
        caller_voice = excluded.caller_voice,
        caller_language = excluded.caller_language,
        auto_next_player = excluded.auto_next_player,
        show_checkout_suggestions = excluded.show_checkout_suggestions,
        enable_achievements_hints = excluded.enable_achievements_hints,
        updated_at = excluded.updated_at
    `);
        stmt.run(req.tenantId, settings.theme || 'dark', settings.language || 'de', settings.sound_enabled !== undefined ? (settings.sound_enabled ? 1 : 0) : 1, settings.caller_voice || 'john', settings.caller_language || 'en', settings.auto_next_player !== undefined ? (settings.auto_next_player ? 1 : 0) : 1, settings.show_checkout_suggestions !== undefined ? (settings.show_checkout_suggestions ? 1 : 0) : 1, settings.enable_achievements_hints !== undefined ? (settings.enable_achievements_hints ? 1 : 0) : 1, Date.now());
        res.json({ message: 'Settings updated successfully' });
    }
    catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});
// Update specific setting
router.patch('/:key', auth_1.authenticateTenant, (req, res) => {
    const { key } = req.params;
    const { value } = req.body;
    const db = (0, database_1.getDatabase)();
    // Map of allowed keys to their exact column names (prevents SQL interpolation risk)
    const allowedColumns = {
        'theme': 'theme',
        'language': 'language',
        'sound_enabled': 'sound_enabled',
        'caller_voice': 'caller_voice',
        'caller_language': 'caller_language',
        'auto_next_player': 'auto_next_player',
        'show_checkout_suggestions': 'show_checkout_suggestions',
        'enable_achievements_hints': 'enable_achievements_hints',
    };
    const column = allowedColumns[key];
    if (!column) {
        return res.status(400).json({ error: 'Invalid setting key' });
    }
    try {
        // Get current settings
        let settings = db.prepare('SELECT * FROM user_settings WHERE tenant_id = ?').get(req.tenantId);
        if (!settings) {
            // Create default settings first
            db.prepare(`
        INSERT INTO user_settings (tenant_id, updated_at)
        VALUES (?, ?)
      `).run(req.tenantId, Date.now());
            settings = db.prepare('SELECT * FROM user_settings WHERE tenant_id = ?').get(req.tenantId);
        }
        // Update specific field using safe column name from whitelist
        const updateValue = typeof value === 'boolean' ? (value ? 1 : 0) : value;
        db.prepare(`
      UPDATE user_settings
      SET ${column} = ?, updated_at = ?
      WHERE tenant_id = ?
    `).run(updateValue, Date.now(), req.tenantId);
        res.json({ message: 'Setting updated successfully' });
    }
    catch (error) {
        console.error('Error updating setting:', error);
        res.status(500).json({ error: 'Failed to update setting' });
    }
});
exports.default = router;
//# sourceMappingURL=settings.js.map