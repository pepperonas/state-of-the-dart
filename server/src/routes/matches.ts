import express, { Response } from 'express';
import { getDatabase } from '../database';
import { AuthRequest, authenticateTenant } from '../middleware/auth';

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
      query += ` AND status = ?`;
      params.push(status);
    }

    query += ` ORDER BY started_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const matches = db.prepare(query).all(...params);

    // Parse JSON fields
    const parsedMatches = matches.map((match: any) => ({
      ...match,
      settings: JSON.parse(match.settings),
    }));

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

    // Get match players
    const players = db.prepare('SELECT * FROM match_players WHERE match_id = ?').all(id);

    // Get legs
    const legs = db.prepare('SELECT * FROM legs WHERE match_id = ? ORDER BY leg_number ASC').all(id);

    // Get throws for each leg
    const legsWithThrows = legs.map((leg: any) => {
      const throws = db.prepare('SELECT * FROM throws WHERE leg_id = ? ORDER BY visit_number ASC').all(leg.id);
      return {
        ...leg,
        throws: throws.map((t: any) => ({
          ...t,
          darts: JSON.parse(t.darts),
        })),
      };
    });

    const fullMatch = {
      ...match,
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

// Create match
router.post('/', authenticateTenant, (req: AuthRequest, res: Response) => {
  const { id, gameType, status, players, settings, startedAt } = req.body;

  if (!id || !gameType || !players || !settings) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const db = getDatabase();

  try {
    // Start transaction
    const createMatch = db.transaction(() => {
      // Insert match
      db.prepare(`
        INSERT INTO matches (id, tenant_id, game_type, status, started_at, settings)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, req.tenantId, gameType, status || 'setup', startedAt || Date.now(), JSON.stringify(settings));

      // Insert match players
      const insertPlayer = db.prepare(`
        INSERT INTO match_players (
          id, match_id, player_id, match_average, first9_average,
          highest_score, checkouts_hit, checkout_attempts,
          match_180s, match_171_plus, match_140_plus, match_100_plus, match_60_plus,
          darts_thrown, legs_won, sets_won
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const player of players) {
        insertPlayer.run(
          player.id || `${id}-${player.playerId}`,
          id,
          player.playerId,
          player.matchAverage || 0,
          player.first9Average || 0,
          player.highestScore || 0,
          player.checkoutsHit || 0,
          player.checkoutAttempts || 0,
          player.match180s || 0,
          player.match171Plus || 0,
          player.match140Plus || 0,
          player.match100Plus || 0,
          player.match60Plus || 0,
          player.dartsThrown || 0,
          player.legsWon || 0,
          player.setsWon || 0
        );
      }
    });

    createMatch();

    res.status(201).json({ id, message: 'Match created successfully' });
  } catch (error) {
    console.error('Error creating match:', error);
    res.status(500).json({ error: 'Failed to create match' });
  }
});

// Update match
router.put('/:id', authenticateTenant, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, winner, completedAt, players, legs } = req.body;

  const db = getDatabase();

  try {
    // Verify ownership
    const match = db.prepare('SELECT * FROM matches WHERE id = ? AND tenant_id = ?').get(id, req.tenantId);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Start transaction
    const updateMatch = db.transaction(() => {
      // Update match
      if (status || winner || completedAt) {
        let query = 'UPDATE matches SET ';
        const updates: string[] = [];
        const params: any[] = [];

        if (status) {
          updates.push('status = ?');
          params.push(status);
        }
        if (winner) {
          updates.push('winner = ?');
          params.push(winner);
        }
        if (completedAt) {
          updates.push('completed_at = ?');
          params.push(completedAt);
        }

        query += updates.join(', ') + ' WHERE id = ?';
        params.push(id);

        db.prepare(query).run(...params);
      }

      // Update players if provided
      if (players && Array.isArray(players)) {
        const updatePlayer = db.prepare(`
          UPDATE match_players SET
            match_average = ?,
            first9_average = ?,
            highest_score = ?,
            checkouts_hit = ?,
            checkout_attempts = ?,
            match_180s = ?,
            match_171_plus = ?,
            match_140_plus = ?,
            match_100_plus = ?,
            match_60_plus = ?,
            darts_thrown = ?,
            legs_won = ?,
            sets_won = ?
          WHERE match_id = ? AND player_id = ?
        `);

        for (const player of players) {
          updatePlayer.run(
            player.matchAverage || 0,
            player.first9Average || 0,
            player.highestScore || 0,
            player.checkoutsHit || 0,
            player.checkoutAttempts || 0,
            player.match180s || 0,
            player.match171Plus || 0,
            player.match140Plus || 0,
            player.match100Plus || 0,
            player.match60Plus || 0,
            player.dartsThrown || 0,
            player.legsWon || 0,
            player.setsWon || 0,
            id,
            player.playerId
          );
        }
      }

      // Update/Insert legs if provided
      if (legs && Array.isArray(legs)) {
        for (const leg of legs) {
          const existingLeg = db.prepare('SELECT id FROM legs WHERE id = ?').get(leg.id);

          if (existingLeg) {
            // Update leg
            db.prepare(`
              UPDATE legs SET winner = ?, completed_at = ? WHERE id = ?
            `).run(leg.winner, leg.completedAt, leg.id);

            // Update throws
            if (leg.throws && Array.isArray(leg.throws)) {
              for (const throwData of leg.throws) {
                db.prepare(`
                  INSERT OR REPLACE INTO throws (
                    id, leg_id, player_id, darts, score, remaining,
                    timestamp, is_checkout_attempt, is_bust, visit_number,
                    running_average, first9_average
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                  throwData.id,
                  leg.id,
                  throwData.playerId,
                  JSON.stringify(throwData.darts),
                  throwData.score,
                  throwData.remaining,
                  throwData.timestamp,
                  throwData.isCheckoutAttempt ? 1 : 0,
                  throwData.isBust ? 1 : 0,
                  throwData.visitNumber,
                  throwData.runningAverage,
                  throwData.first9Average
                );
              }
            }
          } else {
            // Insert leg
            db.prepare(`
              INSERT INTO legs (id, match_id, leg_number, winner, started_at, completed_at)
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(leg.id, id, leg.legNumber, leg.winner, leg.startedAt, leg.completedAt);

            // Insert throws
            if (leg.throws && Array.isArray(leg.throws)) {
              const insertThrow = db.prepare(`
                INSERT INTO throws (
                  id, leg_id, player_id, darts, score, remaining,
                  timestamp, is_checkout_attempt, is_bust, visit_number,
                  running_average, first9_average
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `);

              for (const throwData of leg.throws) {
                insertThrow.run(
                  throwData.id,
                  leg.id,
                  throwData.playerId,
                  JSON.stringify(throwData.darts),
                  throwData.score,
                  throwData.remaining,
                  throwData.timestamp,
                  throwData.isCheckoutAttempt ? 1 : 0,
                  throwData.isBust ? 1 : 0,
                  throwData.visitNumber,
                  throwData.runningAverage,
                  throwData.first9Average
                );
              }
            }
          }
        }
      }
    });

    updateMatch();

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
