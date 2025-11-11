import { IsEnum, IsUrl, IsNotEmpty } from 'class-validator';
import { SubscriptionTier } from '@prisma/client';

export class CreateCheckoutDto {
  @IsEnum(SubscriptionTier)
  @IsNotEmpty()
  tier: SubscriptionTier;

  @IsUrl()
  @IsNotEmpty()
  successUrl: string;

  @IsUrl()
  @IsNotEmpty()
  cancelUrl: string;

  // Optional: hint routing by country/currency (feature-flagged)
  country?: string; // ISO 2 (best effort)
  currency?: string; // ISO 4217
}
