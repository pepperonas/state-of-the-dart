import { Request, Response, NextFunction } from 'express';
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
export declare const authenticateTenant: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const authenticateToken: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const optionalAuth: (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map