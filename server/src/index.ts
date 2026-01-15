import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { initDatabase } from './database';

// Initialize Express app
const app = express();

// Initialize database
initDatabase();

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
import tenantsRouter from './routes/tenants';
import playersRouter from './routes/players';
import matchesRouter from './routes/matches';
import trainingRouter from './routes/training';
import achievementsRouter from './routes/achievements';

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
    },
  });
});

// Use route handlers
app.use('/api/tenants', tenantsRouter);
app.use('/api/players', playersRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/training', trainingRouter);
app.use('/api/achievements', achievementsRouter);

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
