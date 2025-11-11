import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import Stripe from 'stripe';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  // Stripe Price IDs (these should be in .env in production)
  private readonly PRICE_IDS = {
    STARTER: null, // Free tier
    // Support multiple env names for consistency with "Growth/Scale" naming
    GROW: process.env.STRIPE_PRICE_GROWTH
      || process.env.STRIPE_PRICE_GROW
      || process.env.STRIPE_PRICE_GO
      || 'price_go_monthly',
    SCALE: process.env.STRIPE_PRICE_SCALE
      || process.env.STRIPE_PRICE_PLUS
      || 'price_plus_monthly',
    ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE || process.env.STRIPE_PRICE_PRO || null,
  };

  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
  ) {}

  /**
   * Create or get Stripe customer for user
   */
  async ensureStripeCustomer(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If user already has a Stripe customer ID, return it
    if (user.stripe_customer_id) {
      return user.stripe_customer_id;
    }

    // Create new Stripe customer
    const customer = await this.stripeService.createCustomer(user.email, user.name, {
      userId: user.id,
    });

    // Save customer ID to database
    await this.prisma.user.update({
      where: { id: userId },
      data: { stripe_customer_id: customer.id },
    });

    this.logger.log(`Created Stripe customer ${customer.id} for user ${userId}`);
    return customer.id;
  }

  /**
   * Create checkout session for subscription (Stripe path)
   */
  async createCheckoutSession(params: {
    userId: string;
    tier: SubscriptionTier;
    successUrl: string;
    cancelUrl: string;
  }): Promise<Stripe.Checkout.Session> {
    const { userId, tier, successUrl, cancelUrl } = params;

    if (tier === 'STARTER') {
      throw new BadRequestException('Cannot create checkout for free tier');
    }

    const priceId = this.PRICE_IDS[tier];
    if (!priceId) {
      throw new BadRequestException(`Invalid tier: ${tier}`);
    }

    const customerId = await this.ensureStripeCustomer(userId);

    return await this.stripeService.createCheckoutSession({
      customerId,
      priceId,
      successUrl,
      cancelUrl,
      metadata: { userId, tier },
    });
  }

  /**
   * Handle successful checkout (called by webhook)
   */
  async handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId;
    const tier = session.metadata?.tier as SubscriptionTier;

    if (!userId || !tier) {
      this.logger.error('Missing metadata in checkout session', session.id);
      return;
    }

    const subscriptionId = session.subscription as string;
    const subscription = await this.stripeService.getSubscription(subscriptionId);

    await this.createSubscriptionRecord(userId, subscription, tier);
    await this.updateUserTier(userId, tier);

    this.logger.log(`Checkout complete for user ${userId}, subscription ${subscriptionId}`);
  }

  /**
   * Create subscription record in database
   */
  private async createSubscriptionRecord(
    userId: string,
    stripeSubscription: Stripe.Subscription,
    tier: SubscriptionTier,
  ): Promise<void> {
    const status = this.mapStripeStatus(stripeSubscription.status);

    await this.prisma.subscription.create({
      data: {
        user_id: userId,
        tier,
        status,
        stripe_subscription_id: stripeSubscription.id,
        stripe_price_id: stripeSubscription.items.data[0].price.id,
        stripe_customer_id: stripeSubscription.customer as string,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000),
        cancel_at_period_end: stripeSubscription.cancel_at_period_end,
        trial_start: stripeSubscription.trial_start
          ? new Date(stripeSubscription.trial_start * 1000)
          : null,
        trial_end: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
      },
    });
  }

  /**
   * Update subscription record from Stripe event
   */
  async handleSubscriptionUpdate(stripeSubscription: Stripe.Subscription): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { stripe_subscription_id: stripeSubscription.id },
      include: { user: true },
    });

    if (!subscription) {
      this.logger.error(`Subscription not found: ${stripeSubscription.id}`);
      return;
    }

    const status = this.mapStripeStatus(stripeSubscription.status);

    await this.prisma.subscription.update({
      where: { stripe_subscription_id: stripeSubscription.id },
      data: {
        status,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000),
        cancel_at_period_end: stripeSubscription.cancel_at_period_end,
        canceled_at: stripeSubscription.canceled_at
          ? new Date(stripeSubscription.canceled_at * 1000)
          : null,
      },
    });

    // Update user tier if subscription is no longer active
    if (status === 'CANCELED' || status === 'UNPAID') {
      await this.updateUserTier(subscription.user_id, 'STARTER');
    }

    this.logger.log(`Updated subscription ${stripeSubscription.id}, status: ${status}`);
  }

  /**
   * Handle subscription deletion
   */
  async handleSubscriptionDelete(stripeSubscription: Stripe.Subscription): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { stripe_subscription_id: stripeSubscription.id },
    });

    if (!subscription) {
      return;
    }

    await this.prisma.subscription.update({
      where: { stripe_subscription_id: stripeSubscription.id },
      data: { status: 'CANCELED' },
    });

    await this.updateUserTier(subscription.user_id, 'STARTER');

    this.logger.log(`Deleted subscription ${stripeSubscription.id}`);
  }

  /**
   * Change subscription tier
   */
  async changeTier(userId: string, newTier: SubscriptionTier): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscriptions: { where: { status: 'ACTIVE' }, take: 1 } },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const activeSubscription = user.subscriptions[0];
    if (!activeSubscription) {
      throw new BadRequestException('No active subscription found');
    }

    const newPriceId = this.PRICE_IDS[newTier];
    if (!newPriceId) {
      throw new BadRequestException(`Invalid tier: ${newTier}`);
    }

    // Fetch Stripe subscription to get the subscription item ID
    const stripeSub = await this.stripeService.getSubscription(
      activeSubscription.stripe_subscription_id,
    );
    const itemId = stripeSub.items.data[0]?.id;
    if (!itemId) {
      throw new BadRequestException('Stripe subscription item not found');
    }

    // Update subscription item with the new price
    await this.stripeService.updateSubscription(
      activeSubscription.stripe_subscription_id,
      {
        items: [
          {
            id: itemId,
            price: newPriceId,
          },
        ],
        proration_behavior: 'always_invoice',
      },
    );

    // Update in database
    await this.prisma.subscription.update({
      where: { id: activeSubscription.id },
      data: { tier: newTier, stripe_price_id: newPriceId },
    });

    await this.updateUserTier(userId, newTier);

    this.logger.log(`Changed tier for user ${userId} to ${newTier}`);
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string, cancelAtPeriodEnd = true): Promise<void> {
    const subscription = await this.getActiveSubscription(userId);
    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    await this.stripeService.cancelSubscription(subscription.stripe_subscription_id, cancelAtPeriodEnd);

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancel_at_period_end: cancelAtPeriodEnd },
    });

    if (!cancelAtPeriodEnd) {
      await this.updateUserTier(userId, 'STARTER');
    }

    this.logger.log(
      `Canceled subscription for user ${userId} (at period end: ${cancelAtPeriodEnd})`,
    );
  }

  /**
   * Resume subscription that was set to cancel at period end
   */
  async resumeSubscription(userId: string): Promise<void> {
    const subscription = await this.getActiveSubscription(userId);
    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    if (!subscription.cancel_at_period_end) {
      throw new BadRequestException('Subscription is not set to cancel');
    }

    await this.stripeService.resumeSubscription(subscription.stripe_subscription_id);

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancel_at_period_end: false },
    });

    this.logger.log(`Resumed subscription for user ${userId}`);
  }

  /**
   * Get active subscription for user
   */
  async getActiveSubscription(userId: string) {
    return await this.prisma.subscription.findFirst({
      where: { user_id: userId, status: 'ACTIVE' },
    });
  }

  /**
   * Get all subscriptions for user
   */
  async getUserSubscriptions(userId: string) {
    return await this.prisma.subscription.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * List invoices for current user via Stripe
   */
  async listInvoicesForUser(userId: string, limit = 20) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const customerId = user.stripe_customer_id || (await this.ensureStripeCustomer(userId));
    const invoices = await this.stripeService.listInvoices(customerId, limit);

    return invoices.map((inv) => ({
      id: inv.id,
      amount_due: inv.amount_due,
      amount_paid: inv.amount_paid,
      currency: inv.currency?.toUpperCase() || 'USD',
      status: inv.status,
      created: new Date((inv.created || 0) * 1000).toISOString(),
      hosted_invoice_url: inv.hosted_invoice_url,
      invoice_pdf: inv.invoice_pdf,
      tax: inv.total_tax_amounts?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0,
      lines: inv.lines?.data?.map(l => ({
        description: l.description,
        amount: l.amount,
        currency: l.currency?.toUpperCase() || inv.currency?.toUpperCase() || 'USD',
        proration: l.proration,
      })) || [],
    }));
  }

  /**
   * Create billing portal session
   */
  async createPortalSession(userId: string, returnUrl: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.stripe_customer_id) {
      throw new BadRequestException('No Stripe customer found');
    }

    const session = await this.stripeService.createPortalSession(user.stripe_customer_id, returnUrl);
    return session.url;
  }

  /**
   * Helper: Find userId by Stripe customer ID
   */
  async getUserIdByStripeCustomerId(customerId: string): Promise<string | null> {
    if (!customerId) return null;
    const user = await this.prisma.user.findFirst({
      where: { stripe_customer_id: customerId },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  /**
   * Save invoice to database
   */
  async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    await this.prisma.invoice.create({
      data: {
        stripe_invoice_id: invoice.id,
        stripe_customer_id: invoice.customer as string,
        stripe_subscription_id: invoice.subscription as string | null,
        amount_due: invoice.amount_due,
        amount_paid: invoice.amount_paid,
        currency: invoice.currency,
        status: invoice.status || 'paid',
        invoice_pdf: invoice.invoice_pdf || null,
        hosted_invoice_url: invoice.hosted_invoice_url || null,
        period_start: new Date(invoice.period_start * 1000),
        period_end: new Date(invoice.period_end * 1000),
        paid_at: invoice.status_transitions.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000)
          : null,
      },
    });

    this.logger.log(`Saved invoice ${invoice.id} to database`);
  }

  /**
   * Helper: Update user tier
   */
  private async updateUserTier(userId: string, tier: SubscriptionTier): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { tier },
    });
  }

  /**
   * Helper: Map Stripe subscription status to our enum
   */
  private mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
    const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
      active: 'ACTIVE',
      past_due: 'PAST_DUE',
      canceled: 'CANCELED',
      unpaid: 'UNPAID',
      trialing: 'TRIALING',
      incomplete: 'INCOMPLETE',
      incomplete_expired: 'INCOMPLETE_EXPIRED',
      paused: 'CANCELED', // Map paused to canceled
    };

    return statusMap[stripeStatus] || 'CANCELED';
  }

  /**
   * Get tier limits for quota enforcement
   */
  getTierLimits(tier: SubscriptionTier) {
    const limits = {
      STARTER: {
        tests_per_month: 10,
        ai_tutor_messages: 20,
        question_generations: 0,
        exams_access: 1,
        voice_input: false,
        api_access: false,
      },
      GROW: {
        tests_per_month: -1, // unlimited
        ai_tutor_messages: -1, // unlimited
        question_generations: 100,
        exams_access: -1, // all exams
        voice_input: true,
        api_access: false,
      },
      SCALE: {
        tests_per_month: -1,
        ai_tutor_messages: -1,
        question_generations: -1,
        exams_access: -1,
        voice_input: true,
        api_access: true,
      },
      ENTERPRISE: {
        tests_per_month: -1,
        ai_tutor_messages: -1,
        question_generations: -1,
        exams_access: -1,
        voice_input: true,
        api_access: true,
      },
    };

    return limits[tier];
  }
}
