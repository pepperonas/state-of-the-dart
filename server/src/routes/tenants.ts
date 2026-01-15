import express, { Response } from 'express';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../database';
import { config } from '../config';
import { AuthRequest, authenticateTenant } from '../middleware/auth';

const router = express.Router();

// Register/Login with tenant
router.post('/auth', (req: AuthRequest, res: Response) => {
  const { tenantId, name, avatar } = req.body;

  if (!tenantId || !name) {
    return res.status(400).json({ error: 'tenantId and name are required' });
  }

  const db = getDatabase();

  try {
    // Check if tenant exists
    const existingTenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);

    if (existingTenant) {
      // Update last_active
      db.prepare('UPDATE tenants SET last_active = ? WHERE id = ?').run(Date.now(), tenantId);
    } else {
      // Create new tenant
      db.prepare(`
        INSERT INTO tenants (id, name, avatar, created_at, last_active)
        VALUES (?, ?, ?, ?, ?)
      `).run(tenantId, name, avatar || name.charAt(0).toUpperCase(), Date.now(), Date.now());
    }

    // Generate JWT
    const token = jwt.sign(
      { tenantId },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
    );

    res.json({
      token,
      tenant: {
        id: tenantId,
        name,
        avatar: avatar || name.charAt(0).toUpperCase(),
      },
    });
  } catch (error) {
    console.error('Error in tenant auth:', error);
    res.status(500).json({ error: 'Failed to authenticate tenant' });
  }
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
