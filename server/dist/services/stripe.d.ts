import Stripe from 'stripe';
export declare const stripe: Stripe;
export declare const stripeService: {
    /**
     * Create checkout session for subscription
     */
    createSubscriptionCheckout(userId: string, userEmail: string, priceId: string): Promise<Stripe.Response<Stripe.Checkout.Session>>;
    /**
     * Create checkout session for one-time payment (lifetime)
     */
    createLifetimeCheckout(userId: string, userEmail: string): Promise<Stripe.Response<Stripe.Checkout.Session>>;
    /**
     * Create customer portal session
     */
    createPortalSession(customerId: string): Promise<Stripe.Response<Stripe.BillingPortal.Session>>;
    /**
     * Get subscription details
     */
    getSubscription(subscriptionId: string): Promise<Stripe.Response<Stripe.Subscription>>;
    /**
     * Cancel subscription
     */
    cancelSubscription(subscriptionId: string): Promise<Stripe.Response<Stripe.Subscription>>;
    /**
     * Resume subscription
     */
    resumeSubscription(subscriptionId: string): Promise<Stripe.Response<Stripe.Subscription>>;
};
//# sourceMappingURL=stripe.d.ts.map