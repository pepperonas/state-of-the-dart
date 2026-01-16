import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database';
import { config } from '../config';
import { emailService } from '../services/email';

// Configure Google OAuth
passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.callbackUrl,
    },
    async (accessToken, refreshToken, profile, done) => {
      const db = getDatabase();

      try {
        // Check if user exists with Google ID
        let user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(profile.id) as any;

        if (user) {
          // Update last active
          db.prepare('UPDATE users SET last_active = ? WHERE id = ?').run(Date.now(), user.id);
          return done(null, user);
        }

        // Check if user exists with same email
        const email = profile.emails?.[0]?.value;
        if (email) {
          user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as any;

          if (user) {
            // Link Google account to existing user
            db.prepare('UPDATE users SET google_id = ?, last_active = ? WHERE id = ?').run(
              profile.id,
              Date.now(),
              user.id
            );
            return done(null, user);
          }
        }

        // Create new user
        const userId = uuidv4();
        const name = profile.displayName || profile.name?.givenName || 'User';
        const avatar = profile.photos?.[0]?.value || name.charAt(0).toUpperCase();
        const trialEndsAt = Date.now() + config.trialPeriodDays * 24 * 60 * 60 * 1000;
        
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
        `).run(
          userId,
          userEmail,
          name,
          avatar,
          profile.id,
          1, // Email verified via Google
          subscriptionStatus,
          trialEndsAt,
          isAdmin ? 1 : 0,
          Date.now(),
          Date.now()
        );

        user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

        // Send welcome email
        if (email) {
          try {
            await emailService.sendWelcomeEmail(email, name);
          } catch (error) {
            console.error('Failed to send welcome email:', error);
          }
        }

        done(null, user);
      } catch (error) {
        done(error, undefined);
      }
    }
  )
);

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser((id: string, done) => {
  const db = getDatabase();
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    done(null, user || null);
  } catch (error) {
    done(error as Error, null);
  }
});

export default passport;
