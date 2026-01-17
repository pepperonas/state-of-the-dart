"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stripe_1 = require("../services/stripe");
const database_1 = require("../database");
const config_1 = require("../config");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
/**
 * Create checkout session
 */
router.post('/create-checkout', auth_1.authenticateTenant, async (req, res) => {
    const { plan } = req.body; // 'monthly' or 'lifetime'
    if (!plan || !['monthly', 'lifetime'].includes(plan)) {
        return res.status(400).json({ error: 'Invalid plan. Must be "monthly" or "lifetime"' });
    }
    const db = (0, database_1.getDatabase)();
    try {
        // Get user - use req.user?.id if available (new auth system), otherwise look up via tenant
        const userId = req.user?.id;
        let user;
        if (userId) {
            user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        }
        else if (req.tenantId) {
            // Fallback: look up user via tenant's user_id
            const tenant = db.prepare('SELECT user_id FROM tenants WHERE id = ?').get(req.tenantId);
            if (tenant?.user_id) {
                user = db.prepare('SELECT * FROM users WHERE id = ?').get(tenant.user_id);
            }
        }
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Create checkout session
        let session;
        if (plan === 'monthly') {
            session = await stripe_1.stripeService.createSubscriptionCheckout(user.id, user.email, config_1.config.stripe.priceIdMonthly);
        }
        else {
            session = await stripe_1.stripeService.createLifetimeCheckout(user.id, user.email);
        }
        res.json({ sessionId: session.id, url: session.url });
    }
    catch (error) {
        console.error('Create checkout error:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});
/**
 * Create portal session (for managing subscription)
 */
router.post('/create-portal', auth_1.authenticateTenant, async (req, res) => {
    const db = (0, database_1.getDatabase)();
    try {
        // Get user - use req.user?.id if available (new auth system), otherwise look up via tenant
        const userId = req.user?.id;
        let user;
        if (userId) {
            user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        }
        else if (req.tenantId) {
            // Fallback: look up user via tenant's user_id
            const tenant = db.prepare('SELECT user_id FROM tenants WHERE id = ?').get(req.tenantId);
            if (tenant?.user_id) {
                user = db.prepare('SELECT * FROM users WHERE id = ?').get(tenant.user_id);
            }
        }
        if (!user || !user.stripe_customer_id) {
            return res.status(400).json({ error: 'No active subscription found' });
        }
        const session = await stripe_1.stripeService.createPortalSession(user.stripe_customer_id);
        res.json({ url: session.url });
    }
    catch (error) {
        console.error('Create portal error:', error);
        res.status(500).json({ error: 'Failed to create portal session' });
    }
});
/**
 * Webhook handler for Stripe events
 */
router.post('/webhook', express_1.default.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    if (!sig) {
        return res.status(400).send('No signature');
    }
    let event;
    try {
        event = stripe_1.stripe.webhooks.constructEvent(req.body, sig, config_1.config.stripe.webhookSecret);
    }
    catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    const db = (0, database_1.getDatabase)();
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const userId = session.metadata.userId || session.client_reference_id;
                if (!userId) {
                    console.error('No userId in session metadata');
                    break;
                }
                // Check if it's a lifetime purchase
                if (session.mode === 'payment') {
                    // Lifetime purchase
                    db.prepare(`
            UPDATE users SET
              subscription_status = ?,
              subscription_plan = ?,
              stripe_customer_id = ?,
              subscription_ends_at = NULL
            WHERE id = ?
          `).run('lifetime', 'lifetime', session.customer, userId);
                    console.log(`✅ Lifetime subscription activated for user ${userId}`);
                }
                else {
                    // Monthly subscription
                    const subscription = await stripe_1.stripe.subscriptions.retrieve(session.subscription);
                    db.prepare(`
            UPDATE users SET
              subscription_status = ?,
              subscription_plan = ?,
              stripe_customer_id = ?,
              stripe_subscription_id = ?,
              subscription_ends_at = ?
            WHERE id = ?
          `).run('active', 'monthly', session.customer, session.subscription, subscription.current_period_end * 1000, userId);
                    console.log(`✅ Monthly subscription activated for user ${userId}`);
                }
                break;
            }
            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                const customerId = subscription.customer;
                // Find user by Stripe customer ID
                const user = db.prepare('SELECT * FROM users WHERE stripe_customer_id = ?').get(customerId);
                if (!user) {
                    console.error('User not found for customer:', customerId);
                    break;
                }
                // Update subscription status
                let status = 'active';
                if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
                    status = 'canceled';
                }
                else if (subscription.cancel_at_period_end) {
                    status = 'canceling';
                }
                db.prepare(`
          UPDATE users SET
            subscription_status = ?,
            subscription_ends_at = ?
          WHERE id = ?
        `).run(status, subscription.current_period_end * 1000, user.id);
                console.log(`✅ Subscription updated for user ${user.id}: ${status}`);
                break;
            }
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const customerId = subscription.customer;
                const user = db.prepare('SELECT * FROM users WHERE stripe_customer_id = ?').get(customerId);
                if (!user) {
                    console.error('User not found for customer:', customerId);
                    break;
                }
                // Cancel subscription
                db.prepare(`
          UPDATE users SET
            subscription_status = ?,
            stripe_subscription_id = NULL
          WHERE id = ?
        `).run('canceled', user.id);
                console.log(`✅ Subscription canceled for user ${user.id}`);
                break;
            }
            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                const customerId = invoice.customer;
                const user = db.prepare('SELECT * FROM users WHERE stripe_customer_id = ?').get(customerId);
                if (!user) {
                    console.error('User not found for customer:', customerId);
                    break;
                }
                // Mark subscription as failed
                db.prepare('UPDATE users SET subscription_status = ? WHERE id = ?').run('payment_failed', user.id);
                console.log(`⚠️ Payment failed for user ${user.id}`);
                break;
            }
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                const customerId = invoice.customer;
                const user = db.prepare('SELECT * FROM users WHERE stripe_customer_id = ?').get(customerId);
                if (!user) {
                    console.error('User not found for customer:', customerId);
                    break;
                }
                // Reactivate subscription if it was failed
                if (user.subscription_status === 'payment_failed') {
                    db.prepare('UPDATE users SET subscription_status = ? WHERE id = ?').run('active', user.id);
                    console.log(`✅ Subscription reactivated for user ${user.id}`);
                }
                break;
            }
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
        res.json({ received: true });
    }
    catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});
/**
 * Get subscription status
 */
router.get('/status', auth_1.authenticateTenant, async (req, res) => {
    const db = (0, database_1.getDatabase)();
    try {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.tenantId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const response = {
            subscriptionStatus: user.subscription_status,
            subscriptionPlan: user.subscription_plan,
            trialEndsAt: user.trial_ends_at,
            subscriptionEndsAt: user.subscription_ends_at,
        };
        // Get Stripe subscription details if available
        if (user.stripe_subscription_id) {
            try {
                const subscription = await stripe_1.stripeService.getSubscription(user.stripe_subscription_id);
                response.stripeSubscription = {
                    status: subscription.status,
                    currentPeriodEnd: subscription.current_period_end * 1000,
                    cancelAtPeriodEnd: subscription.cancel_at_period_end,
                };
            }
            catch (error) {
                console.error('Failed to fetch Stripe subscription:', error);
            }
        }
        res.json(response);
    }
    catch (error) {
        console.error('Get subscription status error:', error);
        res.status(500).json({ error: 'Failed to get subscription status' });
    }
});
exports.default = router;
//# sourceMappingURL=payment.js.map