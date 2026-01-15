import Stripe from 'stripe';
import { config } from '../config';

// Initialize Stripe
export const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2023-10-16',
});

export const stripeService = {
  /**
   * Create checkout session for subscription
   */
  async createSubscriptionCheckout(userId: string, userEmail: string, priceId: string) {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${config.appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.appUrl}/pricing?canceled=true`,
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
  async createLifetimeCheckout(userId: string, userEmail: string) {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: config.stripe.priceIdLifetime,
          quantity: 1,
        },
      ],
      success_url: `${config.appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.appUrl}/pricing?canceled=true`,
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
  async createPortalSession(customerId: string) {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${config.appUrl}/settings`,
    });

    return session;
  },

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string) {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    return subscription;
  },

  /**
   * Resume subscription
   */
  async resumeSubscription(subscriptionId: string) {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
    return subscription;
  },
};
