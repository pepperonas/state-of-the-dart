"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("../database");
const config_1 = require("../config");
const email_1 = require("../services/email");
const router = express_1.default.Router();
/**
 * Register new user
 */
router.post('/register', async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name are required' });
    }
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    // Validate password (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const db = (0, database_1.getDatabase)();
    try {
        // Check if user exists
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        // Hash password
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        // Generate verification token
        const verificationToken = crypto_1.default.randomBytes(32).toString('hex');
        const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
        // Calculate trial end date
        const trialEndsAt = Date.now() + config_1.config.trialPeriodDays * 24 * 60 * 60 * 1000;
        // Check if user should be admin
        const isAdmin = email.toLowerCase() === 'martinpaush@gmail.com';
        const subscriptionStatus = isAdmin ? 'lifetime' : 'trial';
        // Create user
        const userId = (0, uuid_1.v4)();
        db.prepare(`
      INSERT INTO users (
        id, email, password_hash, name, avatar,
        email_verified, verification_token, verification_token_expires,
        subscription_status, trial_ends_at, is_admin,
        created_at, last_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, email.toLowerCase(), passwordHash, name, name.charAt(0).toUpperCase(), 0, verificationToken, verificationTokenExpires, subscriptionStatus, trialEndsAt, isAdmin ? 1 : 0, Date.now(), Date.now());
        // Send verification email (don't fail registration if email fails)
        let emailSent = false;
        let emailError = null;
        try {
            await email_1.emailService.sendVerificationEmail(email, verificationToken, name);
            emailSent = true;
        }
        catch (emailErr) {
            console.error('Failed to send verification email:', emailErr.message);
            emailError = emailErr.message;
        }
        if (emailSent) {
            res.status(201).json({
                message: 'Registration successful. Please check your email to verify your account.',
                userId,
            });
        }
        else {
            // User created but email failed - still success but with warning
            res.status(201).json({
                message: 'Account created, but we could not send the verification email. Please use "Resend verification" later.',
                userId,
                emailWarning: emailError,
            });
        }
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});
/**
 * Verify email
 */
router.get('/verify-email/:token', async (req, res) => {
    const { token } = req.params;
    if (!token) {
        return res.status(400).json({ error: 'Verification token is required' });
    }
    const db = (0, database_1.getDatabase)();
    try {
        const user = db.prepare(`
      SELECT * FROM users 
      WHERE verification_token = ? AND verification_token_expires > ?
    `).get(token, Date.now());
        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired verification token' });
        }
        if (user.email_verified) {
            return res.status(400).json({ error: 'Email already verified' });
        }
        // Verify email
        db.prepare(`
      UPDATE users SET
        email_verified = 1,
        verification_token = NULL,
        verification_token_expires = NULL
      WHERE id = ?
    `).run(user.id);
        // Send welcome email
        await email_1.emailService.sendWelcomeEmail(user.email, user.name);
        res.json({ message: 'Email verified successfully. You can now log in.' });
    }
    catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ error: 'Failed to verify email' });
    }
});
/**
 * Login
 */
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    const db = (0, database_1.getDatabase)();
    try {
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
        if (!user || !user.password_hash) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        // Check password
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        // Check email verified
        if (!user.email_verified) {
            return res.status(403).json({ error: 'Please verify your email before logging in' });
        }
        // Check subscription status
        const now = Date.now();
        if (user.subscription_status === 'trial' && user.trial_ends_at < now) {
            db.prepare('UPDATE users SET subscription_status = ? WHERE id = ?').run('expired', user.id);
            return res.status(403).json({
                error: 'Your trial has expired. Please subscribe to continue.',
                subscriptionExpired: true
            });
        }
        if (user.subscription_status === 'active' && user.subscription_ends_at && user.subscription_ends_at < now) {
            db.prepare('UPDATE users SET subscription_status = ? WHERE id = ?').run('expired', user.id);
            return res.status(403).json({
                error: 'Your subscription has expired. Please renew to continue.',
                subscriptionExpired: true
            });
        }
        // Update last active
        db.prepare('UPDATE users SET last_active = ? WHERE id = ?').run(Date.now(), user.id);
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            subscriptionStatus: user.subscription_status,
            isAdmin: user.is_admin === 1
        }, config_1.config.jwtSecret, { expiresIn: config_1.config.jwtExpiresIn });
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
                emailVerified: user.email_verified === 1,
                isAdmin: user.is_admin === 1,
                subscriptionStatus: user.subscription_status,
                trialEndsAt: user.trial_ends_at,
                subscriptionEndsAt: user.subscription_ends_at,
            },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to log in' });
    }
});
/**
 * Request password reset
 */
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }
    const db = (0, database_1.getDatabase)();
    try {
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
        // Always return success to prevent email enumeration
        if (!user) {
            return res.json({ message: 'If the email exists, a reset link has been sent.' });
        }
        // Generate reset token
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const resetTokenExpires = Date.now() + 60 * 60 * 1000; // 1 hour
        // Save reset token
        db.prepare(`
      UPDATE users SET
        reset_password_token = ?,
        reset_password_expires = ?
      WHERE id = ?
    `).run(resetToken, resetTokenExpires, user.id);
        // Send reset email
        await email_1.emailService.sendPasswordResetEmail(user.email, resetToken, user.name);
        res.json({ message: 'If the email exists, a reset link has been sent.' });
    }
    catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({ error: 'Failed to process password reset request' });
    }
});
/**
 * Reset password
 */
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token and new password are required' });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const db = (0, database_1.getDatabase)();
    try {
        const user = db.prepare(`
      SELECT * FROM users 
      WHERE reset_password_token = ? AND reset_password_expires > ?
    `).get(token, Date.now());
        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }
        // Hash new password
        const passwordHash = await bcryptjs_1.default.hash(newPassword, 12);
        // Update password and clear reset token
        db.prepare(`
      UPDATE users SET
        password_hash = ?,
        reset_password_token = NULL,
        reset_password_expires = NULL
      WHERE id = ?
    `).run(passwordHash, user.id);
        res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
    }
    catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});
/**
 * Get current user
 */
const auth_1 = require("../middleware/auth");
router.get('/me', auth_1.authenticateToken, async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'No authentication token provided' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        const db = (0, database_1.getDatabase)();
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            emailVerified: user.email_verified === 1,
            subscriptionStatus: user.subscription_status,
            subscriptionPlan: user.subscription_plan,
            trialEndsAt: user.trial_ends_at,
            subscriptionEndsAt: user.subscription_ends_at,
            isAdmin: user.is_admin === 1,
            createdAt: user.created_at,
        });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});
/**
 * Resend verification email
 */
router.post('/resend-verification', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }
    const db = (0, database_1.getDatabase)();
    try {
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
        if (!user) {
            return res.json({ message: 'If the email exists, a verification link has been sent.' });
        }
        if (user.email_verified) {
            return res.status(400).json({ error: 'Email already verified' });
        }
        // Generate new verification token
        const verificationToken = crypto_1.default.randomBytes(32).toString('hex');
        const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
        db.prepare(`
      UPDATE users SET
        verification_token = ?,
        verification_token_expires = ?
      WHERE id = ?
    `).run(verificationToken, verificationTokenExpires, user.id);
        // Send verification email
        await email_1.emailService.sendVerificationEmail(user.email, verificationToken, user.name);
        res.json({ message: 'Verification email sent.' });
    }
    catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ error: 'Failed to resend verification email' });
    }
});
/**
 * Update user profile (name, avatar)
 */
router.patch('/profile', auth_1.authenticateToken, async (req, res) => {
    const { name, avatar } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Name is required' });
    }
    const db = (0, database_1.getDatabase)();
    try {
        db.prepare(`
      UPDATE users SET
        name = ?,
        avatar = ?
      WHERE id = ?
    `).run(name.trim(), avatar || '👤', userId);
        // Get updated user
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            emailVerified: user.email_verified === 1,
            subscriptionStatus: user.subscription_status,
            subscriptionPlan: user.subscription_plan,
            trialEndsAt: user.trial_ends_at,
            subscriptionEndsAt: user.subscription_ends_at,
            createdAt: user.created_at,
        });
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});
/**
 * Update user email (requires re-verification)
 */
router.patch('/email', auth_1.authenticateToken, async (req, res) => {
    const { newEmail, password } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!newEmail || !password) {
        return res.status(400).json({ error: 'New email and password are required' });
    }
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    const db = (0, database_1.getDatabase)();
    try {
        // Get current user
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Verify password
        const validPassword = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid password' });
        }
        // Check if new email already exists
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(newEmail.toLowerCase(), userId);
        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use' });
        }
        // Generate verification token
        const verificationToken = crypto_1.default.randomBytes(32).toString('hex');
        const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
        // Update email (set to unverified)
        db.prepare(`
      UPDATE users SET
        email = ?,
        email_verified = 0,
        verification_token = ?,
        verification_token_expires = ?
      WHERE id = ?
    `).run(newEmail.toLowerCase(), verificationToken, verificationTokenExpires, userId);
        // Send verification email to new address
        await email_1.emailService.sendVerificationEmail(newEmail, verificationToken, user.name);
        res.json({ message: 'Email updated. Please verify your new email address.' });
    }
    catch (error) {
        console.error('Update email error:', error);
        res.status(500).json({ error: 'Failed to update email' });
    }
});
/**
 * Delete user account (requires password confirmation)
 */
router.delete('/account', auth_1.authenticateToken, async (req, res) => {
    const { password } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!password) {
        return res.status(400).json({ error: 'Password is required' });
    }
    const db = (0, database_1.getDatabase)();
    try {
        // Get user
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // For Google OAuth users (no password), allow deletion without password check
        if (user.password_hash) {
            // Verify password
            const validPassword = await bcryptjs_1.default.compare(password, user.password_hash);
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid password' });
            }
        }
        // Cancel Stripe subscription if exists
        if (user.stripe_subscription_id) {
            try {
                const stripe = require('stripe')(config_1.config.stripe.secretKey);
                await stripe.subscriptions.cancel(user.stripe_subscription_id);
            }
            catch (stripeError) {
                console.error('Stripe cancellation error:', stripeError);
                // Continue with deletion even if Stripe fails
            }
        }
        // Delete all user data
        db.prepare('DELETE FROM training_sessions WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM match_throws WHERE match_id IN (SELECT id FROM matches WHERE user_id = ?)').run(userId);
        db.prepare('DELETE FROM match_legs WHERE match_id IN (SELECT id FROM matches WHERE user_id = ?)').run(userId);
        db.prepare('DELETE FROM matches WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM player_achievements WHERE player_id IN (SELECT id FROM players WHERE user_id = ?)').run(userId);
        db.prepare('DELETE FROM players WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM tenants WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM users WHERE id = ?').run(userId);
        res.json({ message: 'Account deleted successfully' });
    }
    catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Failed to delete account' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map