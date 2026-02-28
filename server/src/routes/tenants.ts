import express, { Response } from 'express';
import { getDatabase } from '../database';
import { AuthRequest, authenticateTenant } from '../middleware/auth';

const router = express.Router();

// Legacy tenant auth - deprecated, use /api/auth/login or /api/auth/google instead
router.post('/auth', (_req: AuthRequest, res: Response) => {
  return res.status(410).json({ error: 'This endpoint is deprecated. Use /api/auth/login or /api/auth/google instead.' });
});

// Get tenant info
router.get('/:id', authenticateTenant, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (req.tenantId !== id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const db = getDatabase();

  try {
    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(id);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json(tenant);
  } catch (error) {
    console.error('Error fetching tenant:', error);
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
});

// Get all tenants (for local profile selection)
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDatabase();

  try {
    const tenants = db.prepare('SELECT id, name, avatar, created_at, last_active FROM tenants ORDER BY last_active DESC').all();
    res.json(tenants);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

// Delete tenant
router.delete('/:id', authenticateTenant, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (req.tenantId !== id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const db = getDatabase();

  try {
    db.prepare('DELETE FROM tenants WHERE id = ?').run(id);
    res.json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
});

export default router;
