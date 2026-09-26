import express, { Response } from 'express';
import { getDatabase } from '../database';
import { AuthRequest, authenticateTenant } from '../middleware/auth';
import { deleteTournament, getTournament, listTournaments, saveTournament, validateTournament } from '../services/tournamentStore';

/** Tournaments of the signed-in tenant. Logic and its tests: services/tournamentStore.ts. */
const router = express.Router();

router.get('/', authenticateTenant, (req: AuthRequest, res: Response) => {
  try {
    res.json(listTournaments(getDatabase(), req.tenantId!));
  } catch (error) {
    console.error('Error listing tournaments:', error);
    res.status(500).json({ error: 'Failed to list tournaments' });
  }
});

router.get('/:id', authenticateTenant, (req: AuthRequest, res: Response) => {
  try {
    const t = getTournament(getDatabase(), req.tenantId!, req.params.id);
    if (!t) return res.status(404).json({ error: 'Tournament not found' });
    res.json(t);
  } catch (error) {
    console.error('Error fetching tournament:', error);
    res.status(500).json({ error: 'Failed to fetch tournament' });
  }
});

router.put('/:id', authenticateTenant, (req: AuthRequest, res: Response) => {
  const body = { ...req.body, id: req.params.id };
  const invalid = validateTournament(body);
  if (invalid) return res.status(400).json({ error: invalid });
  try {
    const result = saveTournament(getDatabase(), req.tenantId!, body);
    if (result === 'forbidden') return res.status(404).json({ error: 'Tournament not found' });
    res.status(result === 'created' ? 201 : 200).json({ id: body.id, result });
  } catch (error) {
    console.error('Error saving tournament:', error);
    res.status(500).json({ error: 'Failed to save tournament' });
  }
});

router.delete('/:id', authenticateTenant, (req: AuthRequest, res: Response) => {
  try {
    if (!deleteTournament(getDatabase(), req.tenantId!, req.params.id)) return res.status(404).json({ error: 'Tournament not found' });
    res.json({ id: req.params.id, deleted: true });
  } catch (error) {
    console.error('Error deleting tournament:', error);
    res.status(500).json({ error: 'Failed to delete tournament' });
  }
});

export default router;
