"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSubscriptionStatus = exports.requireSubscription = void 0;
const database_1 = require("../database");
/**
 * Middleware to check if user has active subscription
 */
const requireSubscription = (req, res, next) => {
    if (!req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    const db = (0, database_1.getDatabase)();
    try {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.tenantId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const now = Date.now();
        // Check subscription status
        if (user.subscription_status === 'lifetime') {
            // Lifetime subscription - always valid
            return next();
        }
        if (user.subscription_status === 'trial') {
            // Check if trial is still valid
            if (user.trial_ends_at > now) {
                return next();
            }
            else {
                // Trial expired
                db.prepare('UPDATE users SET subscription_status = ? WHERE id = ?').run('expired', user.id);
                return res.status(403).json({
                    error: 'Your trial has expired. Please subscribe to continue.',
                    subscriptionRequired: true,
                    subscriptionStatus: 'expired',
                });
            }
        }
        if (user.subscription_status === 'active') {
            // Check if subscription is still valid
            if (!user.subscription_ends_at || user.subscription_ends_at > now) {
                return next();
            }
            else {
                // Subscription expired
                db.prepare('UPDATE users SET subscription_status = ? WHERE id = ?').run('expired', user.id);
                return res.status(403).json({
                    error: 'Your subscription has expired. Please renew to continue.',
                    subscriptionRequired: true,
                    subscriptionStatus: 'expired',
                });
            }
        }
        // Any other status (expired, canceled, payment_failed, etc.)
        return res.status(403).json({
            error: 'Active subscription required',
            subscriptionRequired: true,
            subscriptionStatus: user.subscription_status,
        });
    }
    catch (error) {
        console.error('Subscription check error:', error);
        return res.status(500).json({ error: 'Failed to check subscription status' });
    }
};
exports.requireSubscription = requireSubscription;
/**
 * Middleware to check subscription but allow trial/expired users (for readonly access)
 */
const checkSubscriptionStatus = (req, res, next) => {
    if (!req.tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    const db = (0, database_1.getDatabase)();
    try {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.tenantId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Add subscription info to request
        req.subscriptionStatus = user.subscription_status;
        req.subscriptionEndsAt = user.subscription_ends_at;
        req.trialEndsAt = user.trial_ends_at;
        next();
    }
    catch (error) {
        console.error('Subscription status check error:', error);
        return res.status(500).json({ error: 'Failed to check subscription status' });
    }
};
exports.checkSubscriptionStatus = checkSubscriptionStatus;
//# sourceMappingURL=subscription.js.map