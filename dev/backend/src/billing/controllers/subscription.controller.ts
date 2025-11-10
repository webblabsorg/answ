import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Patch,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { SubscriptionService } from '../services/subscription.service';
import { StripeService } from '../services/stripe.service';
import { CurrencyService } from '../services/currency.service';
import { CreateCheckoutDto, ChangeTierDto, CreatePortalSessionDto } from '../dto';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(
    private subscriptionService: SubscriptionService,
    private stripeService: StripeService,
    private currencyService: CurrencyService,
  ) {}

  /**
   * Create checkout session for new subscription
   * POST /subscriptions/checkout
   */
  @Post('checkout')
  async createCheckout(@CurrentUser() user: any, @Body() dto: CreateCheckoutDto) {
    // Country-based provider routing (feature flag via env JSON map)
    const country = (dto.country || '').toUpperCase();
    const currency = (dto.currency || 'USD').toUpperCase();
    let provider: 'stripe' | 'paypal' = 'stripe';

    try {
      const mapJson = process.env.PAYMENT_PROVIDER_COUNTRY_MAP || '';
      if (mapJson) {
        const mapping = JSON.parse(mapJson) as Record<string, 'stripe' | 'paypal'>;
        if (country && mapping[country]) provider = mapping[country];
      }
    } catch {}

    if (provider === 'paypal') {
      // Use PayPal sandbox adapter and fallback to Stripe on error
      try {
        const { CurrencyService } = await import('../services/currency.service');
        const { PayPalService } = await import('../services/paypal.service');
        const currencySvc = new CurrencyService();
        const pp = new PayPalService();

        // Base prices in USD
        const basePrices: Record<string, number> = { STARTER: 0, GROW: 29, SCALE: 99 };
        const usd = basePrices[dto.tier] ?? 0;
        const amount = await currencySvc.convertFromUSD(usd, currency);

        if (amount <= 0) {
          // Free tier; no checkout, just return to success
          return { url: dto.successUrl };
        }

        const result = await pp.createCheckoutSession({
          amount,
          currency,
          successUrl: dto.successUrl,
          cancelUrl: dto.cancelUrl,
          description: `${dto.tier} plan`,
        });
        return { sessionId: result.id, url: result.url, provider: 'paypal' };
      } catch (e) {
        // Fallback to Stripe
      }
    }

    const session = await this.subscriptionService.createCheckoutSession({
      userId: user.id,
      tier: dto.tier,
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
    });

    return {
      sessionId: session.id,
      url: session.url,
      provider: 'stripe',
    };
  }

  /**
   * Get current user's active subscription
   * GET /subscriptions/current
   */
  @Get('current')
  async getCurrentSubscription(@CurrentUser() user: any) {
    const subscription = await this.subscriptionService.getActiveSubscription(user.id);
    
    if (!subscription) {
      return {
        subscription: null,
        tier: 'STARTER',
        limits: this.subscriptionService.getTierLimits('STARTER'),
      };
    }

    return {
      subscription,
      tier: subscription.tier,
      limits: this.subscriptionService.getTierLimits(subscription.tier),
    };
  }

  /**
   * Get all subscriptions for current user
   * GET /subscriptions
   */
  @Get()
  async getUserSubscriptions(@CurrentUser() user: any) {
    const subscriptions = await this.subscriptionService.getUserSubscriptions(user.id);
    return { subscriptions };
  }

  /**
   * List invoices for current user
   * GET /subscriptions/invoices
   */
  @Get('invoices')
  async listInvoices(@CurrentUser() user: any) {
    const invoices = await this.subscriptionService.listInvoicesForUser(user.id, 50);
    return { invoices };
  }

  /**
   * Change subscription tier
   * PATCH /subscriptions/tier
   */
  @Patch('tier')
  async changeTier(@CurrentUser() user: any, @Body() dto: ChangeTierDto) {
    await this.subscriptionService.changeTier(user.id, dto.tier);
    return { message: 'Subscription tier changed successfully' };
  }

  /**
   * Cancel subscription
   * DELETE /subscriptions
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(
    @CurrentUser() user: any,
    @Body() body: { cancelAtPeriodEnd?: boolean },
  ) {
    await this.subscriptionService.cancelSubscription(
      user.id,
      body.cancelAtPeriodEnd !== false,
    );

    return {
      message: body.cancelAtPeriodEnd !== false
        ? 'Subscription will be canceled at period end'
        : 'Subscription canceled immediately',
    };
  }

  /**
   * Resume subscription that was set to cancel
   * POST /subscriptions/resume
   */
  @Post('resume')
  async resumeSubscription(@CurrentUser() user: any) {
    await this.subscriptionService.resumeSubscription(user.id);
    return { message: 'Subscription resumed successfully' };
  }

  /**
   * Create billing portal session
   * POST /subscriptions/portal
   */
  @Post('portal')
  async createPortalSession(@CurrentUser() user: any, @Body() dto: CreatePortalSessionDto) {
    const url = await this.subscriptionService.createPortalSession(user.id, dto.returnUrl);
    return { url };
  }

  /**
   * Get tier limits for a specific tier
   * GET /subscriptions/tiers/:tier/limits
   */
  @Get('tiers/:tier/limits')
  async getTierLimits(@Param('tier') tierParam: string) {
    const tierKey = (tierParam || 'STARTER').toUpperCase();
    // Accept STARTER, GROW (Growth), SCALE
    const allowed = new Set(['STARTER', 'GROW', 'SCALE', 'ENTERPRISE']);
    const tier = (allowed.has(tierKey) ? tierKey : 'STARTER') as any;
    return {
      tier,
      limits: this.subscriptionService.getTierLimits(tier),
    };
  }

  /**
   * Get pricing information
   * GET /subscriptions/pricing
   */
  @Get('pricing')
  @Public()
  async getPricing(@Param() _unused?: any) {
    // Keep default USD response for backward compatibility
    return {
      tiers: [
        { id: 'STARTER', name: 'Starter', price: 0, currency: 'USD', interval: 'month', features: ['10 tests per month','20 AI tutor messages','Basic AI tutor','1 exam type'] },
        { id: 'GROW', name: 'Growth', price: 29, currency: 'USD', interval: 'month', features: ['Unlimited tests','Unlimited AI tutor','All exams','Voice input/output','100 question generations'] },
        { id: 'SCALE', name: 'Scale', price: 99, currency: 'USD', interval: 'month', features: ['Everything in Growth','Unlimited question generations','Personalized study plans','Priority support','API access'] },
      ],
    };
  }

  /**
   * Multicurrency: GET /subscriptions/pricing/:currency (e.g., EUR)
   */
  @Get('pricing/:currency')
  @Public()
  async getPricingByCurrency(@Param('currency') currency: string): Promise<any> {
    const code = (currency || 'USD').toUpperCase();
    const base = [
      { id: 'STARTER', name: 'Starter', price: 0 },
      { id: 'GROW', name: 'Growth', price: 29 },
      { id: 'SCALE', name: 'Scale', price: 99 },
    ];
    const converted = await Promise.all(
      base.map(async (t) => ({
        ...t,
        price: Math.round((await this.currencyService.convertFromUSD(t.price, code)) * 100) / 100,
        currency: code,
        interval: 'month',
      }))
    );
    return { tiers: converted };
  }
}
