import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
/**
 * Middleware to check if user has active subscription
 */
export declare const requireSubscription: (req: AuthRequest, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
/**
 * Middleware to check subscription but allow trial/expired users (for readonly access)
 */
export declare const checkSubscriptionStatus: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
declare module '../middleware/auth' {
    interface AuthRequest {
        subscriptionStatus?: string;
        subscriptionEndsAt?: number;
        trialEndsAt?: number;
    }
}
//# sourceMappingURL=subscription.d.ts.map