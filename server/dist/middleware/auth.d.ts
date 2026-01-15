import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    tenantId?: string;
    playerId?: string;
}
export declare const authenticateTenant: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const optionalAuth: (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map