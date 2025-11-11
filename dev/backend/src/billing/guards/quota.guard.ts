import { Injectable, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common';

export type FeatureType = string;

export const RequireQuota = (featureType: FeatureType, amount = 1) =>
  SetMetadata('quota', { featureType, amount });

@Injectable()
export class QuotaGuard implements CanActivate {
  async canActivate(_context: ExecutionContext): Promise<boolean> {
    // Stub guard: always allow. Replace with real billing usage checks when BillingModule is enabled.
    return true;
  }
}
