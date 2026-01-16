"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const express_session_1 = __importDefault(require("express-session"));
const passport_1 = __importDefault(require("./config/passport"));
const config_1 = require("./config");
const database_1 = require("./database");
// Initialize Express app
const app = (0, express_1.default)();
// Trust proxy - required when behind Nginx
app.set('trust proxy', true);
// Initialize database
(0, database_1.initDatabase)();
// Security middleware
app.use((0, helmet_1.default)());
// CORS
app.use((0, cors_1.default)({
    origin: config_1.config.corsOrigins,
    credentials: true,
}));
// Body parsing (except for webhooks)
app.use((req, res, next) => {
    if (req.originalUrl === '/api/payment/webhook') {
        next();
    }
    else {
        express_1.default.json({ limit: '10mb' })(req, res, next);
    }
});
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Session middleware
app.use((0, express_session_1.default)({
    secret: config_1.config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: config_1.config.isProduction,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
}));
// Passport initialization
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
// Compression
app.use((0, compression_1.default)());
// Logging
if (config_1.config.nodeEnv === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
else {
    app.use((0, morgan_1.default)('combined'));
}
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.config.rateLimitWindowMs,
    max: config_1.config.rateLimitMaxRequests,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for auth routes (Google OAuth makes multiple redirects)
        return req.path.startsWith('/api/auth/');
    }
});
app.use('/api/', limiter);
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config_1.config.nodeEnv,
    });
});
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const payment_1 = __importDefault(require("./routes/payment"));
const tenants_1 = __importDefault(require("./routes/tenants"));
const players_1 = __importDefault(require("./routes/players"));
const matches_1 = __importDefault(require("./routes/matches"));
const training_1 = __importDefault(require("./routes/training"));
const achievements_1 = __importDefault(require("./routes/achievements"));
const leaderboard_1 = __importDefault(require("./routes/leaderboard"));
const admin_1 = __importDefault(require("./routes/admin"));
const settings_1 = __importDefault(require("./routes/settings"));
// API Routes
app.get('/api', (req, res) => {
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
            settings: '/api/settings',
        },
    });
});
// Use route handlers
app.use('/api/auth', auth_1.default);
app.use('/api/payment', payment_1.default);
app.use('/api/tenants', tenants_1.default);
app.use('/api/players', players_1.default);
app.use('/api/matches', matches_1.default);
app.use('/api/training', training_1.default);
app.use('/api/achievements', achievements_1.default);
app.use('/api/leaderboard', leaderboard_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/settings', settings_1.default);
// Google OAuth routes
app.get('/api/auth/google', passport_1.default.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/api/auth/google/callback', passport_1.default.authenticate('google', { failureRedirect: `${config_1.config.appUrl}/login?error=google_auth_failed` }), (req, res) => {
    // Successful authentication
    const user = req.user;
    // Generate JWT
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({
        userId: user.id,
        email: user.email,
        subscriptionStatus: user.subscription_status,
        isAdmin: user.is_admin === 1
    }, config_1.config.jwtSecret, { expiresIn: config_1.config.jwtExpiresIn });
    // Redirect to app with token
    res.redirect(`${config_1.config.appUrl}/auth/callback?token=${token}`);
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});
// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: config_1.config.isProduction ? 'Internal server error' : err.message,
        ...(config_1.config.isProduction ? {} : { stack: err.stack }),
    });
});
// Start server
const server = app.listen(config_1.config.port, () => {
    console.log(`
🚀 State of the Dart API Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Server: http://localhost:${config_1.config.port}
🏥 Health: http://localhost:${config_1.config.port}/health
🔧 API: http://localhost:${config_1.config.port}/api
🌍 Environment: ${config_1.config.nodeEnv}
📊 Database: ${config_1.config.databasePath}
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
exports.default = app;
//# sourceMappingURL=index.js.map