"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const uuid_1 = require("uuid");
const database_1 = require("../database");
const config_1 = require("../config");
const email_1 = require("../services/email");
// Configure Google OAuth
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: config_1.config.google.clientId,
    clientSecret: config_1.config.google.clientSecret,
    callbackURL: config_1.config.google.callbackUrl,
}, async (accessToken, refreshToken, profile, done) => {
    const db = (0, database_1.getDatabase)();
    try {
        // Check if user exists with Google ID
        let user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(profile.id);
        if (user) {
            // Update last active and ensure admin status for martinpaush@gmail.com
            const shouldBeAdmin = user.email?.toLowerCase() === 'martinpaush@gmail.com';
            db.prepare('UPDATE users SET last_active = ?, is_admin = ? WHERE id = ?').run(Date.now(), shouldBeAdmin ? 1 : user.is_admin, user.id);
            // Refresh user data after update
            user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
            return done(null, user);
        }
        // Check if user exists with same email
        const email = profile.emails?.[0]?.value;
        if (email) {
            user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
            if (user) {
                // Link Google account to existing user and ensure admin status
                const shouldBeAdmin = user.email?.toLowerCase() === 'martinpaush@gmail.com';
                db.prepare('UPDATE users SET google_id = ?, last_active = ?, is_admin = ? WHERE id = ?').run(profile.id, Date.now(), shouldBeAdmin ? 1 : user.is_admin, user.id);
                // Refresh user data after update
                user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
                return done(null, user);
            }
        }
        // Create new user
        const userId = (0, uuid_1.v4)();
        const name = profile.displayName || profile.name?.givenName || 'User';
        const avatar = profile.photos?.[0]?.value || name.charAt(0).toUpperCase();
        const trialEndsAt = Date.now() + config_1.config.trialPeriodDays * 24 * 60 * 60 * 1000;
        // Check if user should be admin
        const userEmail = email?.toLowerCase() || `${profile.id}@google.oauth`;
        const isAdmin = userEmail === 'martinpaush@gmail.com';
        const subscriptionStatus = isAdmin ? 'lifetime' : 'trial';
        db.prepare(`
          INSERT INTO users (
            id, email, name, avatar, google_id,
            email_verified, subscription_status, trial_ends_at, is_admin,
            created_at, last_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(userId, userEmail, name, avatar, profile.id, 1, // Email verified via Google
        subscriptionStatus, trialEndsAt, isAdmin ? 1 : 0, Date.now(), Date.now());
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        // Send welcome email
        if (email) {
            try {
                await email_1.emailService.sendWelcomeEmail(email, name);
            }
            catch (error) {
                console.error('Failed to send welcome email:', error);
            }
        }
        done(null, user);
    }
    catch (error) {
        done(error, undefined);
    }
}));
// Serialize user for session
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
// Deserialize user from session
passport_1.default.deserializeUser((id, done) => {
    const db = (0, database_1.getDatabase)();
    try {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        done(null, user || null);
    }
    catch (error) {
        done(error, null);
    }
});
exports.default = passport_1.default;
//# sourceMappingURL=passport.js.map