import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsageTrackingService, FeatureType } from '../services/usage-tracking.service';

// Decorator to specify which feature to check quota for
export const RequireQuota = (featureType: FeatureType, amount = 1) => 
  SetMetadata('quota', { featureType, amount });

@Injectable()
export class QuotaGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private usageTracking: UsageTrackingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const quotaMetadata = this.reflector.get<{ featureType: FeatureType; amount: number }>(
      'quota',
      context.getHandler(),
    );

    // If no quota metadata, allow access
    if (!quotaMetadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const { featureType, amount } = quotaMetadata;

    // Check if user can use this feature
    const result = await this.usageTracking.canUseFeature(user.id, featureType, amount);

    if (!result.allowed) {
      throw new ForbiddenException({
        message: result.reason,
        usage: result.usage,
        limits: result.limits,
        upgradeUrl: '/subscription/manage',
      });
    }

    // Track usage after successful check
    await this.usageTracking.trackUsage(user.id, featureType, amount);

    return true;
  }
}
