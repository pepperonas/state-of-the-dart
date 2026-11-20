import jwt from 'jsonwebtoken';
import { planForTenant, planForUser } from '../services/plan';

/**
 * Who may open an online connection (0.49.0). Until then the socket asked for
 * nothing: anyone who knew the address could create and join rooms. Online
 * play is premium; the token is the one the app already holds.
 */
export type SocketAccess = 'ok' | 'unauthorized' | 'premium_required';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const checkSocketAccess = (token: unknown, db: any, secret: string, now = Date.now()): SocketAccess => {
  if (typeof token !== 'string' || !token) return 'unauthorized';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let decoded: any;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return 'unauthorized';
  }
  const plan = decoded?.userId
    ? planForUser(db, decoded.userId, now)
    : decoded?.tenantId ? planForTenant(db, decoded.tenantId, now) : null;
  if (!plan) return 'unauthorized';
  return plan === 'premium' ? 'ok' : 'premium_required';
};
