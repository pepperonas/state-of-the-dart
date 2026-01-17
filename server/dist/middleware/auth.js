"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.authenticateToken = exports.authenticateTenant = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const database_1 = require("../database");
const authenticateTenant = (req, res, next) => {
    const authReq = req;
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'No authentication token provided' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        const db = (0, database_1.getDatabase)();
        // Check if token has tenantId (old system) or userId (new system)
        if (decoded.tenantId) {
            // Old system - tenant directly in token, verify it still exists
            const tenant = db.prepare('SELECT id FROM tenants WHERE id = ?').get(decoded.tenantId);
            if (!tenant) {
                return res.status(404).json({ error: 'Tenant no longer exists' });
            }
            authReq.tenantId = decoded.tenantId;
            authReq.playerId = decoded.playerId;
        }
        else if (decoded.userId) {
            // New system - get tenant from user_id (most recently active)
            const tenant = db.prepare('SELECT id FROM tenants WHERE user_id = ? ORDER BY last_active DESC LIMIT 1').get(decoded.userId);
            if (!tenant) {
                return res.status(404).json({ error: 'No tenant found for user' });
            }
            authReq.tenantId = tenant.id;
            authReq.user = {
                id: decoded.userId,
                email: decoded.email,
                subscriptionStatus: decoded.subscriptionStatus,
            };
        }
        else {
            return res.status(401).json({ error: 'Invalid token format' });
        }
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
exports.authenticateTenant = authenticateTenant;
const authenticateToken = (req, res, next) => {
    const authReq = req;
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'No authentication token provided' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        authReq.user = {
            id: decoded.userId,
            email: decoded.email,
            subscriptionStatus: decoded.subscriptionStatus,
        };
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
exports.authenticateToken = authenticateToken;
const optionalAuth = (req, res, next) => {
    const authReq = req;
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
            authReq.tenantId = decoded.tenantId;
            authReq.playerId = decoded.playerId;
        }
        catch (error) {
            // Invalid token, but we allow the request to continue without auth
            console.warn('Invalid token in optional auth:', error);
        }
    }
    next();
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth.js.map