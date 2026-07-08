import { Router, Response } from 'express';
import { getDatabase } from '../database';
import { authenticateTenant, AuthRequest } from '../middleware/auth';

const router = Router();

// Get user settings
router.get('/', authenticateTenant, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
  
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
        sound_volume: 70,
        caller_volume: 70,
        effects_volume: 70,
        show_stats_during_game: true,
        confirm_scores: false,
        vibration_enabled: true,
        updated_at: Date.now()
      });
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update user settings
router.put('/', authenticateTenant, (req: AuthRequest, res: Response) => {
  const db = getDatabase();
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
        sound_volume,
        caller_volume,
        effects_volume,
        show_stats_during_game,
        confirm_scores,
        vibration_enabled,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(tenant_id) DO UPDATE SET
        theme = excluded.theme,
        language = excluded.language,
        sound_enabled = excluded.sound_enabled,
        caller_voice = excluded.caller_voice,
        caller_language = excluded.caller_language,
        auto_next_player = excluded.auto_next_player,
        show_checkout_suggestions = excluded.show_checkout_suggestions,
        enable_achievements_hints = excluded.enable_achievements_hints,
        sound_volume = excluded.sound_volume,
        caller_volume = excluded.caller_volume,
        effects_volume = excluded.effects_volume,
        show_stats_during_game = excluded.show_stats_during_game,
        confirm_scores = excluded.confirm_scores,
        vibration_enabled = excluded.vibration_enabled,
        updated_at = excluded.updated_at
    `);

    // Clamp a 0-100 volume, falling back to 70 when absent/invalid.
    const vol = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 70;
    };
    const bool = (v: any, fallback: number) => (v !== undefined ? (v ? 1 : 0) : fallback);

    stmt.run(
      req.tenantId,
      settings.theme || 'dark',
      settings.language || 'de',
      bool(settings.sound_enabled, 1),
      settings.caller_voice || 'john',
      settings.caller_language || 'en',
      bool(settings.auto_next_player, 1),
      bool(settings.show_checkout_suggestions, 1),
      bool(settings.enable_achievements_hints, 1),
      settings.sound_volume !== undefined ? vol(settings.sound_volume) : 70,
      settings.caller_volume !== undefined ? vol(settings.caller_volume) : 70,
      settings.effects_volume !== undefined ? vol(settings.effects_volume) : 70,
      bool(settings.show_stats_during_game, 1),
      bool(settings.confirm_scores, 0),
      bool(settings.vibration_enabled, 1),
      Date.now()
    );
    
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Update specific setting
router.patch('/:key', authenticateTenant, (req: AuthRequest, res: Response) => {
  const { key } = req.params;
  const { value } = req.body;
  const db = getDatabase();
  
  // Map of allowed keys to their exact column names (prevents SQL interpolation risk)
  const allowedColumns: Record<string, string> = {
    'theme': 'theme',
    'language': 'language',
    'sound_enabled': 'sound_enabled',
    'caller_voice': 'caller_voice',
    'caller_language': 'caller_language',
    'auto_next_player': 'auto_next_player',
    'show_checkout_suggestions': 'show_checkout_suggestions',
    'enable_achievements_hints': 'enable_achievements_hints',
    'sound_volume': 'sound_volume',
    'caller_volume': 'caller_volume',
    'effects_volume': 'effects_volume',
    'show_stats_during_game': 'show_stats_during_game',
    'confirm_scores': 'confirm_scores',
    'vibration_enabled': 'vibration_enabled',
  };

  const column = allowedColumns[key];
  if (!column) {
    return res.status(400).json({ error: 'Invalid setting key' });
  }

  try {
    // Get current settings
    let settings = db.prepare('SELECT * FROM user_settings WHERE tenant_id = ?').get(req.tenantId) as any;

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
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

export default router;
