"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeService = exports.stripe = void 0;
const stripe_1 = __importDefault(require("stripe"));
const config_1 = require("../config");
// Initialize Stripe
exports.stripe = new stripe_1.default(config_1.config.stripe.secretKey, {
    apiVersion: '2023-10-16',
});
exports.stripeService = {
    /**
     * Create checkout session for subscription
     */
    async createSubscriptionCheckout(userId, userEmail, priceId) {
        const session = await exports.stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: `${config_1.config.appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${config_1.config.appUrl}/pricing?canceled=true`,
            customer_email: userEmail,
            client_reference_id: userId,
            metadata: {
                userId,
            },
        });
        return session;
    },
    /**
     * Create checkout session for one-time payment (lifetime)
     */
    async createLifetimeCheckout(userId, userEmail) {
        const session = await exports.stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: config_1.config.stripe.priceIdLifetime,
                    quantity: 1,
                },
            ],
            success_url: `${config_1.config.appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${config_1.config.appUrl}/pricing?canceled=true`,
            customer_email: userEmail,
            client_reference_id: userId,
            metadata: {
                userId,
                type: 'lifetime',
            },
        });
        return session;
    },
    /**
     * Create customer portal session
     */
    async createPortalSession(customerId) {
        const session = await exports.stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${config_1.config.appUrl}/settings`,
        });
        return session;
    },
    /**
     * Get subscription details
     */
    async getSubscription(subscriptionId) {
        const subscription = await exports.stripe.subscriptions.retrieve(subscriptionId);
        return subscription;
    },
    /**
     * Cancel subscription
     */
    async cancelSubscription(subscriptionId) {
        const subscription = await exports.stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
        });
        return subscription;
    },
    /**
     * Resume subscription
     */
    async resumeSubscription(subscriptionId) {
        const subscription = await exports.stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: false,
        });
        return subscription;
    },
};
//# sourceMappingURL=stripe.js.map