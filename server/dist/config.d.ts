export declare const config: {
    port: number;
    nodeEnv: string;
    appUrl: string;
    apiUrl: string;
    databasePath: string;
    jwtSecret: string;
    jwtExpiresIn: string;
    sessionSecret: string;
    corsOrigins: string[];
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    smtp: {
        host: string;
        port: number;
        secure: true;
        user: string;
        password: string;
        from: string;
    };
    google: {
        clientId: string;
        clientSecret: string;
        callbackUrl: string;
    };
    stripe: {
        secretKey: string;
        publishableKey: string;
        webhookSecret: string;
        priceIdMonthly: string;
        priceIdLifetime: string;
    };
    trialPeriodDays: number;
    isProduction: boolean;
};
//# sourceMappingURL=config.d.ts.map