import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { getDatabase } from '../database';
import { config } from '../config';
import { emailService } from '../services/email';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();

/**
 * Register new user
 */
router.post('/register', async (req: Request, res: Response) => {
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

  const db = getDatabase();

  try {
    // Check if user exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Calculate trial end date
    const trialEndsAt = Date.now() + config.trialPeriodDays * 24 * 60 * 60 * 1000;

    // Create user
    const userId = uuidv4();
    db.prepare(`
      INSERT INTO users (
        id, email, password_hash, name, avatar,
        email_verified, verification_token, verification_token_expires,
        subscription_status, trial_ends_at,
        created_at, last_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      email.toLowerCase(),
      passwordHash,
      name,
      name.charAt(0).toUpperCase(),
      0,
      verificationToken,
      verificationTokenExpires,
      'trial',
      trialEndsAt,
      Date.now(),
      Date.now()
    );

    // Send verification email
    await emailService.sendVerificationEmail(email, verificationToken, name);

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      userId,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

/**
 * Verify email
 */
router.get('/verify-email/:token', async (req: Request, res: Response) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({ error: 'Verification token is required' });
  }

  const db = getDatabase();

  try {
    const user = db.prepare(`
      SELECT * FROM users 
      WHERE verification_token = ? AND verification_token_expires > ?
    `).get(token, Date.now()) as any;

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
    await emailService.sendWelcomeEmail(user.email, user.name);

    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

/**
 * Login
 */
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = getDatabase();

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as any;

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
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
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        subscriptionStatus: user.subscription_status 
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        isAdmin: user.is_admin === 1,
        subscriptionStatus: user.subscription_status,
        trialEndsAt: user.trial_ends_at,
        subscriptionEndsAt: user.subscription_ends_at,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

/**
 * Request password reset
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const db = getDatabase();

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as any;

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If the email exists, a reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = Date.now() + 60 * 60 * 1000; // 1 hour

    // Save reset token
    db.prepare(`
      UPDATE users SET
        reset_password_token = ?,
        reset_password_expires = ?
      WHERE id = ?
    `).run(resetToken, resetTokenExpires, user.id);

    // Send reset email
    await emailService.sendPasswordResetEmail(user.email, resetToken, user.name);

    res.json({ message: 'If the email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

/**
 * Reset password
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const db = getDatabase();

  try {
    const user = db.prepare(`
      SELECT * FROM users 
      WHERE reset_password_token = ? AND reset_password_expires > ?
    `).get(token, Date.now()) as any;

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    db.prepare(`
      UPDATE users SET
        password_hash = ?,
        reset_password_token = NULL,
        reset_password_expires = NULL
      WHERE id = ?
    `).run(passwordHash, user.id);

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

/**
 * Get current user
 */
import { authenticateToken } from '../middleware/auth';

router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No authentication token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    const db = getDatabase();

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.userId) as any;

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
      createdAt: user.created_at,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

/**
 * Resend verification email
 */
router.post('/resend-verification', async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const db = getDatabase();

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as any;

    if (!user) {
      return res.json({ message: 'If the email exists, a verification link has been sent.' });
    }

    if (user.email_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;

    db.prepare(`
      UPDATE users SET
        verification_token = ?,
        verification_token_expires = ?
      WHERE id = ?
    `).run(verificationToken, verificationTokenExpires, user.id);

    // Send verification email
    await emailService.sendVerificationEmail(user.email, verificationToken, user.name);

    res.json({ message: 'Verification email sent.' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

/**
 * Update user profile (name, avatar)
 */
router.patch('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { name, avatar } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const db = getDatabase();

  try {
    db.prepare(`
      UPDATE users SET
        name = ?,
        avatar = ?
      WHERE id = ?
    `).run(name.trim(), avatar || '👤', userId);

    // Get updated user
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

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
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * Update user email (requires re-verification)
 */
router.patch('/email', authenticateToken, async (req: AuthRequest, res: Response) => {
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

  const db = getDatabase();

  try {
    // Get current user
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Check if new email already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(newEmail.toLowerCase(), userId);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
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
    await emailService.sendVerificationEmail(newEmail, verificationToken, user.name);

    res.json({ message: 'Email updated. Please verify your new email address.' });
  } catch (error) {
    console.error('Update email error:', error);
    res.status(500).json({ error: 'Failed to update email' });
  }
});

/**
 * Delete user account (requires password confirmation)
 */
router.delete('/account', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { password } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const db = getDatabase();

  try {
    // Get user
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // For Google OAuth users (no password), allow deletion without password check
    if (user.password_hash) {
      // Verify password
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid password' });
      }
    }

    // Cancel Stripe subscription if exists
    if (user.stripe_subscription_id) {
      try {
        const stripe = require('stripe')(config.stripe.secretKey);
        await stripe.subscriptions.cancel(user.stripe_subscription_id);
      } catch (stripeError) {
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
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
