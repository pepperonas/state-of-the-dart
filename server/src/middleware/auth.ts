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

export const authenticateTenant = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No authentication token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    
    // Check if token has tenantId (old system) or userId (new system)
    if (decoded.tenantId) {
      // Old system - tenant directly in token
      req.tenantId = decoded.tenantId;
      req.playerId = decoded.playerId;
    } else if (decoded.userId) {
      // New system - get tenant from user_id
      const db = getDatabase();
      const tenant = db.prepare('SELECT id FROM tenants WHERE user_id = ?').get(decoded.userId) as any;
      
      if (!tenant) {
        return res.status(404).json({ error: 'No tenant found for user' });
      }
      
      req.tenantId = tenant.id;
      req.user = {
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

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No authentication token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string; email: string; subscriptionStatus: string };
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      subscriptionStatus: decoded.subscriptionStatus,
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { tenantId: string; playerId?: string };
      req.tenantId = decoded.tenantId;
      req.playerId = decoded.playerId;
    } catch (error) {
      // Invalid token, but we allow the request to continue without auth
      console.warn('Invalid token in optional auth:', error);
    }
  }

  next();
};
