import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { getDatabase } from '../database';

export interface User {
  id: string;
  email: string;
  subscriptionStatus: string;
}

export interface AuthRequest extends Request {
  tenantId?: string;
  playerId?: string;
  user?: User;
}

export const authenticateTenant = (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No authentication token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    const db = getDatabase();

    // Check if token has tenantId (old system) or userId (new system)
    if (decoded.tenantId) {
      // Old system - tenant directly in token, verify it still exists
      const tenant = db.prepare('SELECT id FROM tenants WHERE id = ?').get(decoded.tenantId) as any;
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant no longer exists' });
      }
      authReq.tenantId = decoded.tenantId;
      authReq.playerId = decoded.playerId;
    } else if (decoded.userId) {
      // New system - get tenant from user_id (most recently active)
      const tenant = db.prepare('SELECT id FROM tenants WHERE user_id = ? ORDER BY last_active DESC LIMIT 1').get(decoded.userId) as any;

      if (!tenant) {
        return res.status(404).json({ error: 'No tenant found for user' });
      }

      authReq.tenantId = tenant.id;
      authReq.user = {
        id: decoded.userId,
        email: decoded.email,
        subscriptionStatus: decoded.subscriptionStatus,
      };
    } else {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No authentication token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string; email: string; subscriptionStatus: string };
    authReq.user = {
      id: decoded.userId,
      email: decoded.email,
      subscriptionStatus: decoded.subscriptionStatus,
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { tenantId: string; playerId?: string };
      authReq.tenantId = decoded.tenantId;
      authReq.playerId = decoded.playerId;
    } catch (error) {
      // Invalid token, but we allow the request to continue without auth
      console.warn('Invalid token in optional auth:', error);
    }
  }

  next();
};
