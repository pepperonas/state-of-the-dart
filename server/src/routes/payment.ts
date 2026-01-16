import express, { Request, Response } from 'express';
import { stripe, stripeService } from '../services/stripe';
import { getDatabase } from '../database';
import { config } from '../config';
import { AuthRequest, authenticateTenant } from '../middleware/auth';

const router = express.Router();

/**
 * Create checkout session
 */
router.post('/create-checkout', authenticateTenant, async (req: AuthRequest, res: Response) => {
  const { plan } = req.body; // 'monthly' or 'lifetime'

  if (!plan || !['monthly', 'lifetime'].includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan. Must be "monthly" or "lifetime"' });
  }

  const db = getDatabase();

  try {
    // Get user - use req.user?.id if available (new auth system), otherwise look up via tenant
    const userId = req.user?.id;
    let user: any;

    if (userId) {
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    } else if (req.tenantId) {
      // Fallback: look up user via tenant's user_id
      const tenant = db.prepare('SELECT user_id FROM tenants WHERE id = ?').get(req.tenantId) as any;
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
      session = await stripeService.createSubscriptionCheckout(
        user.id,
        user.email,
        config.stripe.priceIdMonthly
      );
    } else {
      session = await stripeService.createLifetimeCheckout(user.id, user.email);
    }

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Create checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * Create portal session (for managing subscription)
 */
router.post('/create-portal', authenticateTenant, async (req: AuthRequest, res: Response) => {
  const db = getDatabase();

  try {
    // Get user - use req.user?.id if available (new auth system), otherwise look up via tenant
    const userId = req.user?.id;
    let user: any;

    if (userId) {
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    } else if (req.tenantId) {
      // Fallback: look up user via tenant's user_id
      const tenant = db.prepare('SELECT user_id FROM tenants WHERE id = ?').get(req.tenantId) as any;
      if (tenant?.user_id) {
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(tenant.user_id);
      }
    }

    if (!user || !user.stripe_customer_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const session = await stripeService.createPortalSession(user.stripe_customer_id);

    res.json({ url: session.url });
  } catch (error) {
    console.error('Create portal error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

/**
 * Webhook handler for Stripe events
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    return res.status(400).send('No signature');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      config.stripe.webhookSecret
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const db = getDatabase();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
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
        } else {
          // Monthly subscription
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

          db.prepare(`
            UPDATE users SET
              subscription_status = ?,
              subscription_plan = ?,
              stripe_customer_id = ?,
              stripe_subscription_id = ?,
              subscription_ends_at = ?
            WHERE id = ?
          `).run(
            'active',
            'monthly',
            session.customer,
            session.subscription,
            subscription.current_period_end * 1000,
            userId
          );

          console.log(`✅ Monthly subscription activated for user ${userId}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const customerId = subscription.customer;

        // Find user by Stripe customer ID
        const user = db.prepare('SELECT * FROM users WHERE stripe_customer_id = ?').get(customerId) as any;

        if (!user) {
          console.error('User not found for customer:', customerId);
          break;
        }

        // Update subscription status
        let status = 'active';
        if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          status = 'canceled';
        } else if (subscription.cancel_at_period_end) {
          status = 'canceling';
        }

        db.prepare(`
          UPDATE users SET
            subscription_status = ?,
            subscription_ends_at = ?
          WHERE id = ?
        `).run(
          status,
          subscription.current_period_end * 1000,
          user.id
        );

        console.log(`✅ Subscription updated for user ${user.id}: ${status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const customerId = subscription.customer;

        const user = db.prepare('SELECT * FROM users WHERE stripe_customer_id = ?').get(customerId) as any;

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
        const invoice = event.data.object as any;
        const customerId = invoice.customer;

        const user = db.prepare('SELECT * FROM users WHERE stripe_customer_id = ?').get(customerId) as any;

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
        const invoice = event.data.object as any;
        const customerId = invoice.customer;

        const user = db.prepare('SELECT * FROM users WHERE stripe_customer_id = ?').get(customerId) as any;

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
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Get subscription status
 */
router.get('/status', authenticateTenant, async (req: AuthRequest, res: Response) => {
  const db = getDatabase();

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.tenantId) as any;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const response: any = {
      subscriptionStatus: user.subscription_status,
      subscriptionPlan: user.subscription_plan,
      trialEndsAt: user.trial_ends_at,
      subscriptionEndsAt: user.subscription_ends_at,
    };

    // Get Stripe subscription details if available
    if (user.stripe_subscription_id) {
      try {
        const subscription = await stripeService.getSubscription(user.stripe_subscription_id);
        response.stripeSubscription = {
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end * 1000,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        };
      } catch (error) {
        console.error('Failed to fetch Stripe subscription:', error);
      }
    }

    res.json(response);
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

export default router;
