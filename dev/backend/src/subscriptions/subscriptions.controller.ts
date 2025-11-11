import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';

@Controller('subscriptions')
export class SubscriptionsController {
  @Public()
  @Get('pricing/:currency')
  pricing(@Param('currency') currency: string) {
    // Minimal static pricing to avoid 404s in dev; replace with billing when enabled
    const upper = String(currency || 'USD').toUpperCase();
    const tiers = [
      { id: 'STARTER', price: 0, currency: upper },
      { id: 'GROW', price: 29, currency: upper },
      { id: 'SCALE', price: 99, currency: upper },
    ];
    return { currency: upper, tiers };
  }
}
