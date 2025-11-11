import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { StripeService } from './stripe.service';

export interface DunningSchedule {
  attemptNumber: number;
  daysAfterFailure: number;
  emailTemplate: string;
  retryPayment: boolean;
}

@Injectable()
export class DunningService {
  private readonly logger = new Logger(DunningService.name);

  // Dunning schedule configuration
  private readonly dunningSchedule: DunningSchedule[] = [
    { attemptNumber: 1, daysAfterFailure: 0, emailTemplate: 'payment_failed_immediate', retryPayment: true },
    { attemptNumber: 2, daysAfterFailure: 3, emailTemplate: 'payment_failed_3days', retryPayment: true },
    { attemptNumber: 3, daysAfterFailure: 7, emailTemplate: 'payment_failed_7days', retryPayment: true },
    { attemptNumber: 4, daysAfterFailure: 14, emailTemplate: 'payment_failed_final_warning', retryPayment: false },
  ];

  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
  ) {}

  /**
   * Handle failed payment
   */
  async handleFailedPayment(invoiceId: string, userId: string, reason: string) {
    this.logger.warn(`Payment failed for invoice ${invoiceId}, user ${userId}: ${reason}`);

    // Get subscription
    const subscription = await this.prisma.subscription.findFirst({
      where: { user_id: userId, status: 'ACTIVE' },
      include: { user: true },
    });

    if (!subscription) {
      this.logger.error(`No active subscription found for user ${userId}`);
      return;
    }

    // Create dunning record
    const dunning = await this.prisma.dunningAttempt.create({
      data: {
        user_id: userId,
        subscription_id: subscription.id,
        invoice_id: invoiceId,
        attempt_number: 1,
        failure_reason: reason,
        next_attempt_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
        status: 'PENDING',
      },
    });

    // Send immediate failure email
    await this.sendDunningEmail(dunning.id, 'payment_failed_immediate');

    return dunning;
  }

  /**
   * Process dunning attempts (called by cron job)
   */
  async processDunningAttempts() {
    const pendingAttempts = await this.prisma.dunningAttempt.findMany({
      where: {
        status: 'PENDING',
        next_attempt_at: {
          lte: new Date(),
        },
      },
      include: {
        user: true,
        subscription: true,
      },
    });

    this.logger.log(`Processing ${pendingAttempts.length} dunning attempts`);

    for (const attempt of pendingAttempts) {
      await this.processSingleAttempt(attempt);
    }
  }

  // Run daily at 9 AM server time
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async scheduledProcess() {
    try {
      await this.processDunningAttempts();
    } catch (e) {
      this.logger.error('Scheduled dunning processing failed', e);
    }
  }

  /**
   * Process single dunning attempt
   */
  private async processSingleAttempt(attempt: any) {
    const nextAttemptNumber = attempt.attempt_number + 1;
    const schedule = this.dunningSchedule.find((s) => s.attemptNumber === nextAttemptNumber);

    if (!schedule) {
      // No more retries, cancel subscription
      this.logger.warn(`Dunning exhausted for subscription ${attempt.subscription_id}`);
      
      await this.cancelSubscription(attempt.subscription_id, 'Payment failure after all dunning attempts');
      
      await this.prisma.dunningAttempt.update({
        where: { id: attempt.id },
        data: { 
          status: 'EXHAUSTED',
          completed_at: new Date(),
        },
      });

      return;
    }

    // Retry payment if configured
    let retrySuccessful = false;
    if (schedule.retryPayment) {
      retrySuccessful = await this.retryPayment(attempt.subscription_id, attempt.invoice_id);
    }

    if (retrySuccessful) {
      // Payment succeeded
      await this.prisma.dunningAttempt.update({
        where: { id: attempt.id },
        data: { 
          status: 'RECOVERED',
          completed_at: new Date(),
        },
      });

      await this.sendDunningEmail(attempt.id, 'payment_recovered');
      
      this.logger.log(`Payment recovered for subscription ${attempt.subscription_id}`);
    } else {
      // Payment still failing, schedule next attempt
      const nextAttemptDate = new Date(
        Date.now() + schedule.daysAfterFailure * 24 * 60 * 60 * 1000,
      );

      await this.prisma.dunningAttempt.update({
        where: { id: attempt.id },
        data: {
          attempt_number: nextAttemptNumber,
          next_attempt_at: nextAttemptDate,
          last_attempt_at: new Date(),
        },
      });

      await this.sendDunningEmail(attempt.id, schedule.emailTemplate);
      
      this.logger.log(
        `Dunning attempt ${nextAttemptNumber} scheduled for ${nextAttemptDate} for subscription ${attempt.subscription_id}`,
      );
    }
  }

  /**
   * Retry payment for subscription
   */
  private async retryPayment(subscriptionId: string, invoiceId: string): Promise<boolean> {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription || !subscription.stripe_subscription_id) {
        return false;
      }

      // Attempt to retrieve and pay the invoice
      const invoice = await this.stripeService.retrieveInvoice(invoiceId);
      
      if (invoice.status === 'paid') {
        return true;
      }

      // Attempt to pay the invoice
      const paidInvoice = await this.stripeService.payInvoice(invoiceId);
      
      return paidInvoice.status === 'paid';
    } catch (error) {
      this.logger.error(`Failed to retry payment for subscription ${subscriptionId}:`, error);
      return false;
    }
  }

  /**
   * Cancel subscription due to payment failure
   */
  private async cancelSubscription(subscriptionId: string, reason: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      return;
    }

    // Cancel in Stripe
    if (subscription.stripe_subscription_id) {
      await this.stripeService.cancelSubscription(subscription.stripe_subscription_id);
    }

    // Update in database
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'CANCELED',
        canceled_at: new Date(),
      },
    });

    // Downgrade user to free tier
    await this.prisma.user.update({
      where: { id: subscription.user_id },
      data: { tier: 'STARTER' },
    });

    this.logger.log(`Subscription ${subscriptionId} canceled: ${reason}`);
  }

  /**
   * Send dunning email
   */
  private async sendDunningEmail(dunningAttemptId: string, template: string) {
    const attempt = await this.prisma.dunningAttempt.findUnique({
      where: { id: dunningAttemptId },
      include: {
        user: true,
        subscription: true,
      },
    });

    if (!attempt) {
      return;
    }

    // TODO: Implement email sending with template
    // For now, just log
    this.logger.log(
      `[EMAIL] Sending ${template} to ${attempt.user.email} for dunning attempt ${dunningAttemptId}`,
    );

    // Email templates would contain:
    // - payment_failed_immediate: "Your payment failed. Please update your payment method."
    // - payment_failed_3days: "Reminder: Your payment is still pending. Update your payment method."
    // - payment_failed_7days: "Urgent: Your payment has failed multiple times. Update your payment method to avoid service interruption."
    // - payment_failed_final_warning: "Final notice: Your subscription will be canceled in 7 days if payment is not received."
    // - payment_recovered: "Great news! Your payment has been processed successfully."
  }

  /**
   * Get dunning history for user
   */
  async getDunningHistory(userId: string) {
    const attempts = await this.prisma.dunningAttempt.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    return attempts;
  }

  /**
   * Get dunning statistics
   */
  async getDunningStats() {
    const [pending, recovered, exhausted] = await Promise.all([
      this.prisma.dunningAttempt.count({
        where: { status: 'PENDING' },
      }),
      this.prisma.dunningAttempt.count({
        where: { status: 'RECOVERED' },
      }),
      this.prisma.dunningAttempt.count({
        where: { status: 'EXHAUSTED' },
      }),
    ]);

    const recoveryRate = recovered / (recovered + exhausted) * 100 || 0;

    return {
      pending,
      recovered,
      exhausted,
      recovery_rate: recoveryRate.toFixed(2),
    };
  }
}
