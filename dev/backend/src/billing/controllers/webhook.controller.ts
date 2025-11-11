import { Controller, Post, Req, Res, HttpStatus, Logger, RawBodyRequest } from '@nestjs/common';
import { Public } from '../../auth/decorators/public.decorator';
import { Request, Response } from 'express';
import { StripeService } from '../services/stripe.service';
import { SubscriptionService } from '../services/subscription.service';
import { DunningService } from '../services/dunning.service';
import Stripe from 'stripe';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private stripeService: StripeService,
    private subscriptionService: SubscriptionService,
    private dunningService: DunningService,
  ) {}

  /**
   * Handle Stripe webhook events
   * POST /webhooks/stripe
   */
  @Post('stripe')
  @Public()
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ) {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      this.logger.error('Missing stripe-signature header');
      return res.status(HttpStatus.BAD_REQUEST).send('Missing signature');
    }

    let event: Stripe.Event;

    try {
      // Construct event from raw body and signature
      event = this.stripeService.constructWebhookEvent(req.rawBody as Buffer, signature);
    } catch (error) {
      this.logger.error('Webhook signature verification failed:', error);
      return res.status(HttpStatus.BAD_REQUEST).send(`Webhook Error: ${error.message}`);
    }

    this.logger.log(`Received webhook event: ${event.type}`);

    try {
      // Handle different event types
      switch (event.type) {
        // Checkout session completed
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        // Subscription created
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        // Subscription updated
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        // Subscription deleted/canceled
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        // Invoice paid successfully
        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;

        // Invoice payment failed
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        // Payment intent succeeded
        case 'payment_intent.succeeded':
          this.logger.log('Payment intent succeeded:', event.data.object);
          break;

        // Payment intent failed
        case 'payment_intent.payment_failed':
          this.logger.error('Payment intent failed:', event.data.object);
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }

      // Return 200 to acknowledge receipt of the event
      return res.status(HttpStatus.OK).json({ received: true });
    } catch (error) {
      this.logger.error(`Error handling webhook event ${event.type}:`, error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Webhook handler failed');
    }
  }

  /**
   * Handle checkout session completed
   */
  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    this.logger.log(`Checkout session completed: ${session.id}`);
    await this.subscriptionService.handleCheckoutComplete(session);
  }

  /**
   * Handle subscription created
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    this.logger.log(`Subscription created: ${subscription.id}`);
    // Usually handled by checkout.session.completed, but log it
  }

  /**
   * Handle subscription updated
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    this.logger.log(`Subscription updated: ${subscription.id}, status: ${subscription.status}`);
    await this.subscriptionService.handleSubscriptionUpdate(subscription);
  }

  /**
   * Handle subscription deleted
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    this.logger.log(`Subscription deleted: ${subscription.id}`);
    await this.subscriptionService.handleSubscriptionDelete(subscription);
  }

  /**
   * Handle invoice paid
   */
  private async handleInvoicePaid(invoice: Stripe.Invoice) {
    this.logger.log(`Invoice paid: ${invoice.id}`);
    await this.subscriptionService.handleInvoicePaid(invoice);
  }

  /**
   * Handle invoice payment failed
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    this.logger.error(`Invoice payment failed: ${invoice.id}`);
    try {
      let userId: string | null = null;
      const subscriptionId = (invoice.subscription as string) || '';
      if (subscriptionId) {
        const sub = await this.stripeService.getSubscription(subscriptionId);
        userId = (sub.metadata?.userId as string) || null;
      }

      if (!userId && invoice.customer) {
        userId = await this.subscriptionService.getUserIdByStripeCustomerId(invoice.customer as string);
      }

      if (!userId) {
        this.logger.error(`Unable to resolve user for failed invoice ${invoice.id}`);
        return;
      }

      const reason = invoice.last_finalization_error?.message || 'payment_failed';
      await this.dunningService.handleFailedPayment(invoice.id, userId, reason);
    } catch (err) {
      this.logger.error(`Dunning handling failed for invoice ${invoice.id}:`, err);
    }
  }
}
