import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import passport from './config/passport';
import { config } from './config';
import { initDatabase } from './database';

// Initialize Express app
const app = express();

// Trust proxy - required when behind Nginx
app.set('trust proxy', true);

// Initialize database
initDatabase();

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));

// Body parsing (except for webhooks)
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payment/webhook') {
    next();
  } else {
    express.json({ limit: '10mb' })(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session middleware
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.isProduction,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Compression
app.use(compression());

// Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  });
});

// Import routes
import authRouter from './routes/auth';
import paymentRouter from './routes/payment';
import tenantsRouter from './routes/tenants';
import playersRouter from './routes/players';
import matchesRouter from './routes/matches';
import trainingRouter from './routes/training';
import achievementsRouter from './routes/achievements';
import leaderboardRouter from './routes/leaderboard';
import adminRouter from './routes/admin';

// API Routes
app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: 'State of the Dart API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      tenants: '/api/tenants',
      players: '/api/players',
      matches: '/api/matches',
      training: '/api/training',
      achievements: '/api/achievements',
      leaderboard: '/api/leaderboard',
    },
  });
});

// Use route handlers
app.use('/api/auth', authRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/tenants', tenantsRouter);
app.use('/api/players', playersRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/training', trainingRouter);
app.use('/api/achievements', achievementsRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/admin', adminRouter);

// Google OAuth routes
app.get('/api/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/api/auth/google/callback',
  passport.authenticate('google', { failureRedirect: `${config.appUrl}/login?error=google_auth_failed` }),
  (req, res) => {
    // Successful authentication
    const user = req.user as any;
    
    // Generate JWT
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        subscriptionStatus: user.subscription_status,
        isAdmin: user.is_admin === 1
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
    
    // Redirect to app with token
    res.redirect(`${config.appUrl}/auth/callback?token=${token}`);
  }
);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  
  res.status(500).json({
    error: config.isProduction ? 'Internal server error' : err.message,
    ...(config.isProduction ? {} : { stack: err.stack }),
  });
});

// Start server
const server = app.listen(config.port, () => {
  console.log(`
🚀 State of the Dart API Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Server: http://localhost:${config.port}
🏥 Health: http://localhost:${config.port}/health
🔧 API: http://localhost:${config.port}/api
🌍 Environment: ${config.nodeEnv}
📊 Database: ${config.databasePath}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app;
