import express, { Response } from 'express';
import { getDatabase } from '../database';
import { AuthRequest, authenticateTenant } from '../middleware/auth';

const router = express.Router();

// Get all achievements
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDatabase();

  try {
    const achievements = db.prepare('SELECT * FROM achievements ORDER BY points ASC').all();
    res.json(achievements);
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

// Get player achievements
router.get('/player/:playerId', authenticateTenant, (req: AuthRequest, res: Response) => {
  const { playerId } = req.params;
  const db = getDatabase();

  try {
    console.log(`[Achievements API] Fetching achievements for player ${playerId}, tenant ${req.tenantId}`);
    
    const achievements = db.prepare(`
      SELECT 
        pa.id,
        pa.player_id,
        pa.achievement_id,
        pa.unlocked_at,
        pa.progress,
        pa.game_id,
        a.name, 
        a.description, 
        a.icon, 
        a.category, 
        a.points, 
        a.rarity, 
        a.target
      FROM player_achievements pa
      JOIN achievements a ON pa.achievement_id = a.id
      WHERE pa.player_id = ?
      ORDER BY pa.unlocked_at DESC
    `).all(playerId);

    console.log(`[Achievements API] Found ${achievements.length} achievements for player ${playerId}`);
    res.json(achievements);
  } catch (error) {
    console.error('Error fetching player achievements:', error);
    res.status(500).json({ error: 'Failed to fetch player achievements' });
  }
});

// Unlock achievement for player
router.post('/player/:playerId/unlock', authenticateTenant, (req: AuthRequest, res: Response) => {
  const { playerId } = req.params;
  const { achievementId, progress } = req.body;

  if (!achievementId) {
    return res.status(400).json({ error: 'achievementId is required' });
  }

  const db = getDatabase();

  try {
    // Check if player exists in database
    const playerExists = db.prepare('SELECT 1 FROM players WHERE id = ?').get(playerId);
    if (!playerExists) {
      return res.json({ message: 'Skipped - player not in database' });
    }

    // Check if achievement exists
    const achievement = db.prepare('SELECT * FROM achievements WHERE id = ?').get(achievementId);
    if (!achievement) {
      return res.status(404).json({ error: 'Achievement not found' });
    }

    // Unlock achievement
    db.prepare(`
      INSERT OR REPLACE INTO player_achievements (id, player_id, achievement_id, unlocked_at, progress)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      `${playerId}-${achievementId}`,
      playerId,
      achievementId,
      Date.now(),
      progress || 100
    );

    res.json({ message: 'Achievement unlocked successfully' });
  } catch (error) {
    console.error('Error unlocking achievement:', error);
    res.status(500).json({ error: 'Failed to unlock achievement' });
  }
});

// Update achievement progress
router.put('/player/:playerId/progress', authenticateTenant, (req: AuthRequest, res: Response) => {
  const { playerId } = req.params;
  const { achievements } = req.body; // Frontend sends { achievements: { "achievement-id": { current, target, percentage } } }

  if (!achievements || typeof achievements !== 'object') {
    return res.status(400).json({ error: 'achievements object is required' });
  }

  const db = getDatabase();

  try {
    console.log(`[Achievements API] Updating progress for player ${playerId}:`, Object.keys(achievements).length, 'achievements');

    // Check if player exists in database before attempting to write
    const playerExists = db.prepare('SELECT 1 FROM players WHERE id = ?').get(playerId);
    if (!playerExists) {
      // Player not in DB (e.g. bot or local-only player) - silently skip
      return res.json({ message: 'Skipped - player not in database' });
    }

    // Process each achievement progress update
    for (const [achievementId, progressData] of Object.entries(achievements)) {
      const progress = (progressData as any).percentage || (progressData as any).progress || 0;

      // Only update if not already unlocked (progress < 100)
      if (progress < 100) {
        db.prepare(`
          INSERT OR REPLACE INTO player_achievements (id, player_id, achievement_id, unlocked_at, progress)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          `${playerId}-${achievementId}`,
          playerId,
          achievementId,
          null, // unlocked_at is null for progress updates (not unlocked yet)
          progress
        );
      }
    }

    res.json({ message: 'Achievement progress updated successfully' });
  } catch (error) {
    console.error('Error updating achievement progress:', error);
    res.status(500).json({ error: 'Failed to update achievement progress' });
  }
});

export default router;
