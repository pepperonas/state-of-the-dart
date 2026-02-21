export declare const emailService: {
    /**
     * Send verification email
     */
    sendVerificationEmail(email: string, token: string, name: string): Promise<void>;
    /**
     * Send password reset email
     */
    sendPasswordResetEmail(email: string, token: string, name: string): Promise<void>;
    /**
     * Send welcome email after verification
     */
    sendWelcomeEmail(email: string, name: string): Promise<void>;
    /**
     * Send trial expiry reminder
     */
    sendTrialExpiryReminder(email: string, name: string, daysLeft: number): Promise<void>;
    /**
     * Send contact form email to support
     */
    sendContactEmail(name: string, email: string, subject: string, message: string): Promise<void>;
};
//# sourceMappingURL=email.d.ts.map