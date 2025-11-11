import { IsEnum, IsNotEmpty } from 'class-validator';
import { SubscriptionTier } from '@prisma/client';

export class ChangeTierDto {
  @IsEnum(SubscriptionTier)
  @IsNotEmpty()
  tier: SubscriptionTier;
}
