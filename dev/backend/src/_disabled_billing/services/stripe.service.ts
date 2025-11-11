import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    this.stripe = new Stripe(apiKey, {
      // Use a valid Stripe API version or omit to use account default
      apiVersion: '2024-06-20',
    });

    this.logger.log('Stripe initialized successfully');
  }

  /**
   * Create or retrieve a Stripe customer
   */
  async createCustomer(email: string, name: string, metadata?: Record<string, string>): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: metadata || {},
      });

      this.logger.log(`Created Stripe customer: ${customer.id} for ${email}`);
      return customer;
    } catch (error) {
      this.logger.error(`Failed to create Stripe customer for ${email}:`, error);
      throw error;
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    try {
      return await this.stripe.customers.retrieve(customerId) as Stripe.Customer;
    } catch (error) {
      this.logger.error(`Failed to retrieve customer ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * Update customer information
   */
  async updateCustomer(customerId: string, params: Stripe.CustomerUpdateParams): Promise<Stripe.Customer> {
    try {
      return await this.stripe.customers.update(customerId, params);
    } catch (error) {
      this.logger.error(`Failed to update customer ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(params: {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    trialPeriodDays?: number;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Checkout.Session> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        customer: params.customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: params.priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        subscription_data: params.trialPeriodDays
          ? {
              trial_period_days: params.trialPeriodDays,
              metadata: params.metadata || {},
            }
          : {
              metadata: params.metadata || {},
            },
      });

      this.logger.log(`Created checkout session: ${session.id}`);
      return session;
    } catch (error) {
      this.logger.error('Failed to create checkout session:', error);
      throw error;
    }
  }

  /**
   * Create a subscription directly (without checkout)
   */
  async createSubscription(params: {
    customerId: string;
    priceId: string;
    trialPeriodDays?: number;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: params.customerId,
        items: [{ price: params.priceId }],
        trial_period_days: params.trialPeriodDays,
        metadata: params.metadata || {},
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      this.logger.log(`Created subscription: ${subscription.id}`);
      return subscription;
    } catch (error) {
      this.logger.error('Failed to create subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      this.logger.error(`Failed to retrieve subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Update subscription (change plan, etc.)
   */
  async updateSubscription(
    subscriptionId: string,
    params: Stripe.SubscriptionUpdateParams,
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, params);
      this.logger.log(`Updated subscription: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to update subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd = true): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd,
      });
      this.logger.log(`Canceled subscription: ${subscriptionId} (at period end: ${cancelAtPeriodEnd})`);
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to cancel subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel subscription immediately
   */
  async cancelSubscriptionImmediately(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.cancel(subscriptionId);
      this.logger.log(`Immediately canceled subscription: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to cancel subscription immediately ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Resume a subscription that was set to cancel at period end
   */
  async resumeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });
      this.logger.log(`Resumed subscription: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to resume subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * List customer's subscriptions
   */
  async listCustomerSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
    try {
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
      });
      return subscriptions.data;
    } catch (error) {
      this.logger.error(`Failed to list subscriptions for customer ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * Create a billing portal session
   */
  async createPortalSession(customerId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session> {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
      this.logger.log(`Created billing portal session for customer: ${customerId}`);
      return session;
    } catch (error) {
      this.logger.error(`Failed to create billing portal session for ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * List invoices for a customer
   */
  async listInvoices(customerId: string, limit = 10): Promise<Stripe.Invoice[]> {
    try {
      const invoices = await this.stripe.invoices.list({
        customer: customerId,
        limit,
      });
      return invoices.data;
    } catch (error) {
      this.logger.error(`Failed to list invoices for customer ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * Get upcoming invoice
   */
  async getUpcomingInvoice(customerId: string): Promise<Stripe.Invoice> {
    try {
      return await this.stripe.invoices.retrieveUpcoming({
        customer: customerId,
      });
    } catch (error) {
      this.logger.error(`Failed to get upcoming invoice for ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * Construct webhook event from raw body and signature
   */
  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    try {
      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      this.logger.error('Failed to construct webhook event:', error);
      throw error;
    }
  }

  /**
   * Get Stripe instance (for advanced operations)
   */
  getStripe(): Stripe {
    return this.stripe;
  }
}
