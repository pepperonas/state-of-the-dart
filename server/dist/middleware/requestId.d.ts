import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            requestId?: string;
        }
    }
}
export declare const requestIdMiddleware: (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=requestId.d.ts.map