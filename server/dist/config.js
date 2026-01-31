"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
exports.config = {
    // Server
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    appUrl: process.env.APP_URL || 'http://localhost:5173',
    apiUrl: process.env.API_URL || 'http://localhost:3001',
    // Database
    databasePath: process.env.DATABASE_PATH || path_1.default.join(__dirname, '..', 'data', 'state-of-the-dart.db'),
    // JWT & Session
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    jwtExpiresIn: '30d',
    sessionSecret: process.env.SESSION_SECRET || 'dev-session-secret-change-in-production',
    // CORS
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
    // Rate Limiting
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '500', 10), // 500 requests per minute (increased for better UX)
    // SMTP
    smtp: {
        host: process.env.SMTP_HOST || 'premium269-4.web-hosting.com',
        port: parseInt(process.env.SMTP_PORT || '465', 10),
        secure: process.env.SMTP_SECURE === 'true' || true,
        user: process.env.SMTP_USER || 'stateofthedart@celox.io',
        password: process.env.SMTP_PASSWORD || '',
        from: process.env.SMTP_FROM || 'State of the Dart <stateofthedart@celox.io>',
    },
    // Google OAuth
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback',
    },
    // Stripe
    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY || '',
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
        priceIdMonthly: process.env.STRIPE_PRICE_ID_MONTHLY || '',
        priceIdLifetime: process.env.STRIPE_PRICE_ID_LIFETIME || '',
    },
    // Trial Period
    trialPeriodDays: parseInt(process.env.TRIAL_PERIOD_DAYS || '30', 10),
    // Production check
    isProduction: process.env.NODE_ENV === 'production',
};
//# sourceMappingURL=config.js.map