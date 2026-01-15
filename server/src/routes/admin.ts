import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database';
import { AuthRequest, authenticateToken } from '../middleware/auth';

const router = express.Router();

/**
 * Middleware to check if user is admin
 */
const requireAdmin = (req: AuthRequest, res: Response, next: express.NextFunction) => {
  const db = getDatabase();
  const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user?.id) as any;
  
  if (!user || !user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * Get all users
 */
router.get('/users', (req: Request, res: Response) => {
  const db = getDatabase();
  
  try {
    const users = db.prepare(`
      SELECT 
        id, email, name, avatar, email_verified, is_admin,
        subscription_status, subscription_plan, trial_ends_at, subscription_ends_at,
        stripe_customer_id, stripe_subscription_id, created_at, last_active
      FROM users
      ORDER BY created_at DESC
    `).all();

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * Get user stats
 */
router.get('/stats', (req: Request, res: Response) => {
  const db = getDatabase();
  
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
    const activeSubscriptions = db.prepare('SELECT COUNT(*) as count FROM users WHERE subscription_status = ?').get('active') as any;
    const lifetimeSubscriptions = db.prepare('SELECT COUNT(*) as count FROM users WHERE subscription_status = ?').get('lifetime') as any;
    const trialUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE subscription_status = ?').get('trial') as any;
    const expiredUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE subscription_status = ?').get('expired') as any;

    res.json({
      totalUsers: totalUsers.count,
      activeSubscriptions: activeSubscriptions.count,
      lifetimeSubscriptions: lifetimeSubscriptions.count,
      trialUsers: trialUsers.count,
      expiredUsers: expiredUsers.count,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * Update user subscription
 */
router.patch('/users/:userId/subscription', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { subscriptionStatus, subscriptionPlan, subscriptionEndsAt } = req.body;

  if (!subscriptionStatus) {
    return res.status(400).json({ error: 'Subscription status is required' });
  }

  const db = getDatabase();

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update subscription
    db.prepare(`
      UPDATE users SET
        subscription_status = ?,
        subscription_plan = ?,
        subscription_ends_at = ?
      WHERE id = ?
    `).run(subscriptionStatus, subscriptionPlan || null, subscriptionEndsAt || null, userId);

    // Get updated user
    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    res.json(updatedUser);
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

/**
 * Grant lifetime access to user
 */
router.post('/users/:userId/grant-lifetime', async (req: Request, res: Response) => {
  const { userId } = req.params;

  const db = getDatabase();

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Grant lifetime access
    db.prepare(`
      UPDATE users SET
        subscription_status = 'lifetime',
        subscription_plan = 'lifetime',
        subscription_ends_at = NULL
      WHERE id = ?
    `).run(userId);

    // Get updated user
    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    res.json(updatedUser);
  } catch (error) {
    console.error('Grant lifetime error:', error);
    res.status(500).json({ error: 'Failed to grant lifetime access' });
  }
});

/**
 * Revoke user access
 */
router.post('/users/:userId/revoke', async (req: Request, res: Response) => {
  const { userId } = req.params;

  const db = getDatabase();

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Revoke access
    db.prepare(`
      UPDATE users SET
        subscription_status = 'expired',
        subscription_ends_at = ?
      WHERE id = ?
    `).run(Date.now(), userId);

    // Get updated user
    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    res.json(updatedUser);
  } catch (error) {
    console.error('Revoke access error:', error);
    res.status(500).json({ error: 'Failed to revoke access' });
  }
});

/**
 * Delete user
 */
router.delete('/users/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  const db = getDatabase();

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete all user data (cascade)
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

/**
 * Make user admin
 */
router.post('/users/:userId/make-admin', async (req: Request, res: Response) => {
  const { userId } = req.params;

  const db = getDatabase();

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(userId);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    res.json(updatedUser);
  } catch (error) {
    console.error('Make admin error:', error);
    res.status(500).json({ error: 'Failed to make user admin' });
  }
});

/**
 * Remove admin status
 */
router.delete('/users/:userId/admin', async (req: Request, res: Response) => {
  const { userId } = req.params;

  const db = getDatabase();

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.prepare('UPDATE users SET is_admin = 0 WHERE id = ?').run(userId);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    res.json(updatedUser);
  } catch (error) {
    console.error('Remove admin error:', error);
    res.status(500).json({ error: 'Failed to remove admin status' });
  }
});

export default router;
