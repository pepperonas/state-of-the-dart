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
const config_1 = require("./config");
const database_1 = require("./database");
// Initialize Express app
const app = (0, express_1.default)();
// Initialize database
(0, database_1.initDatabase)();
// Security middleware
app.use((0, helmet_1.default)());
// CORS
app.use((0, cors_1.default)({
    origin: config_1.config.corsOrigins,
    credentials: true,
}));
// Body parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
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
const tenants_1 = __importDefault(require("./routes/tenants"));
const players_1 = __importDefault(require("./routes/players"));
const matches_1 = __importDefault(require("./routes/matches"));
const training_1 = __importDefault(require("./routes/training"));
const achievements_1 = __importDefault(require("./routes/achievements"));
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
        },
    });
});
// Use route handlers
app.use('/api/tenants', tenants_1.default);
app.use('/api/players', players_1.default);
app.use('/api/matches', matches_1.default);
app.use('/api/training', training_1.default);
app.use('/api/achievements', achievements_1.default);
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