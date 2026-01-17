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
export declare const authenticateTenant: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map