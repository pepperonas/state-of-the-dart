import express, { Response } from 'express';
import { getDatabase } from '../database';
import { AuthRequest, authenticateTenant } from '../middleware/auth';
import { upsertMatch, updateMatch } from '../services/matchStore';

const router = express.Router();

// Get all matches for tenant
router.get('/', authenticateTenant, (req: AuthRequest, res: Response) => {
  const { limit = '50', offset = '0', status } = req.query;
  const db = getDatabase();

  try {
    let query = `
      SELECT * FROM matches
      WHERE tenant_id = ?
    `;
    const params: any[] = [req.tenantId];

    if (status) {
      const statuses = (status as string).split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length === 1) {
        query += ` AND status = ?`;
        params.push(statuses[0]);
      } else if (statuses.length > 1) {
        query += ` AND status IN (${statuses.map(() => '?').join(',')})`;
        params.push(...statuses);
      }
    }

    // Order by completed_at DESC for completed matches, started_at DESC for others
    query += ` ORDER BY 
      CASE 
        WHEN status = 'completed' AND completed_at IS NOT NULL THEN completed_at 
        ELSE started_at 
      END DESC 
      LIMIT ? OFFSET ?`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const matches = db.prepare(query).all(...params);

    // Get players for each match and parse JSON fields
    const parsedMatches = matches.map((match: any) => {
      // Get match players
      const matchPlayers = db.prepare(`
        SELECT
          mp.*,
          p.name,
          p.avatar,
          p.is_bot,
          p.bot_level
        FROM match_players mp
        LEFT JOIN players p ON mp.player_id = p.id
        WHERE mp.match_id = ?
      `).all(match.id);

      // Transform snake_case to camelCase for players
      const players = matchPlayers.map((mp: any) => ({
        id: mp.id,
        playerId: mp.player_id,
        name: mp.name || 'Unknown',
        avatar: mp.avatar || '🎯',
        isBot: mp.is_bot === 1,
        botLevel: mp.bot_level,
        matchAverage: mp.match_average || 0,
        first9Average: mp.first9_average || 0,
        matchHighestScore: mp.highest_score || 0,
        highestScore: mp.highest_score || 0,
        checkoutsHit: mp.checkouts_hit || 0,
        checkoutAttempts: mp.checkout_attempts || 0,
        match180s: mp.match_180s || 0,
        match171Plus: mp.match_171_plus || 0,
        match140Plus: mp.match_140_plus || 0,
        match100Plus: mp.match_100_plus || 0,
        match60Plus: mp.match_60_plus || 0,
        dartsThrown: mp.darts_thrown || 0,
        legsWon: mp.legs_won || 0,
        setsWon: mp.sets_won || 0,
      }));

      return {
        id: match.id,
        type: match.game_type,
        status: match.status,
        winner: match.winner,
        startedAt: match.started_at,
        completedAt: match.completed_at,
        settings: JSON.parse(match.settings),
        players,
      };
    });

    res.json(parsedMatches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// Get single match with full details
router.get('/:id', authenticateTenant, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = getDatabase();

  try {
    // Get match
    const match = db.prepare('SELECT * FROM matches WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Get match players with player info (JOIN with players table)
    const matchPlayers = db.prepare(`
      SELECT
        mp.*,
        p.name,
        p.avatar,
        p.is_bot,
        p.bot_level
      FROM match_players mp
      LEFT JOIN players p ON mp.player_id = p.id
      WHERE mp.match_id = ?
    `).all(id);

    // Transform snake_case to camelCase for players
    const players = matchPlayers.map((mp: any) => ({
      id: mp.id,
      playerId: mp.player_id,
      name: mp.name || 'Unknown',
      avatar: mp.avatar || '🎯',
      isBot: mp.is_bot === 1,
      botLevel: mp.bot_level,
      matchAverage: mp.match_average || 0,
      first9Average: mp.first9_average || 0,
      matchHighestScore: mp.highest_score || 0,
      highestScore: mp.highest_score || 0,
      checkoutsHit: mp.checkouts_hit || 0,
      checkoutAttempts: mp.checkout_attempts || 0,
      match180s: mp.match_180s || 0,
      match171Plus: mp.match_171_plus || 0,
      match140Plus: mp.match_140_plus || 0,
      match100Plus: mp.match_100_plus || 0,
      match60Plus: mp.match_60_plus || 0,
      dartsThrown: mp.darts_thrown || 0,
      legsWon: mp.legs_won || 0,
      setsWon: mp.sets_won || 0,
    }));

    // Get legs
    const legs = db.prepare('SELECT * FROM legs WHERE match_id = ? ORDER BY leg_number ASC').all(id);

    // Get throws for each leg
    const legsWithThrows = legs.map((leg: any) => {
      const throws = db.prepare('SELECT * FROM throws WHERE leg_id = ? ORDER BY visit_number ASC').all(leg.id);
      return {
        id: leg.id,
        legNumber: leg.leg_number,
        winner: leg.winner,
        startedAt: leg.started_at,
        completedAt: leg.completed_at,
        throws: throws.map((t: any) => ({
          id: t.id,
          playerId: t.player_id,
          darts: JSON.parse(t.darts),
          score: t.score,
          remaining: t.remaining,
          timestamp: t.timestamp,
          isCheckoutAttempt: t.is_checkout_attempt === 1,
          isBust: t.is_bust === 1,
          visitNumber: t.visit_number,
          runningAverage: t.running_average,
          first9Average: t.first9_average,
        })),
      };
    });

    const fullMatch = {
      id: (match as any).id,
      type: (match as any).game_type,
      status: (match as any).status,
      winner: (match as any).winner,
      startedAt: (match as any).started_at,
      completedAt: (match as any).completed_at,
      settings: JSON.parse((match as any).settings),
      players,
      legs: legsWithThrows,
    };

    res.json(fullMatch);
  } catch (error) {
    console.error('Error fetching match:', error);
    res.status(500).json({ error: 'Failed to fetch match' });
  }
});

// Create match (upsert - creates or updates if exists)
router.post('/', authenticateTenant, (req: AuthRequest, res: Response) => {
  const { id, gameType, players, settings } = req.body;

  if (!id || !gameType || !players || !settings) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const outcome = upsertMatch(getDatabase(), req.tenantId!, req.body);
    if (outcome === 'updated') {
      return res.status(200).json({ id, message: 'Match updated successfully' });
    }
    res.status(201).json({ id, message: 'Match created successfully' });
  } catch (error) {
    console.error('Error creating match:', error);
    res.status(500).json({ error: 'Failed to create match' });
  }
});

// Update match
router.put('/:id', authenticateTenant, (req: AuthRequest, res: Response) => {
  try {
    if (!updateMatch(getDatabase(), req.tenantId!, req.params.id, req.body)) {
      return res.status(404).json({ error: 'Match not found' });
    }
    res.json({ message: 'Match updated successfully' });
  } catch (error) {
    console.error('Error updating match:', error);
    res.status(500).json({ error: 'Failed to update match' });
  }
});

// Delete match
router.delete('/:id', authenticateTenant, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = getDatabase();

  try {
    // Verify ownership
    const match = db.prepare('SELECT * FROM matches WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Delete match (cascades)
    db.prepare('DELETE FROM matches WHERE id = ?').run(id);

    res.json({ message: 'Match deleted successfully' });
  } catch (error) {
    console.error('Error deleting match:', error);
    res.status(500).json({ error: 'Failed to delete match' });
  }
});

export default router;
