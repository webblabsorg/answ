import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeService } from './services/stripe.service';
import { SubscriptionService } from './services/subscription.service';
import { UsageTrackingService } from './services/usage-tracking.service';
import { AnalyticsService } from './services/analytics.service';
import { PredictionService } from './services/prediction.service';
import { CurrencyService } from './services/currency.service';
import { SubscriptionController } from './controllers/subscription.controller';
import { WebhookController } from './controllers/webhook.controller';
import { UsageController } from './controllers/usage.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { PredictionsController } from './controllers/predictions.controller';
import { QuotaGuard } from './guards/quota.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [ConfigModule, PrismaModule, UsersModule],
  controllers: [SubscriptionController, WebhookController, UsageController, AnalyticsController, PredictionsController],
  providers: [StripeService, SubscriptionService, UsageTrackingService, AnalyticsService, PredictionService, CurrencyService, QuotaGuard],
  exports: [StripeService, SubscriptionService, UsageTrackingService, AnalyticsService, PredictionService, CurrencyService, QuotaGuard],
})
export class BillingModule {}
