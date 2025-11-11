import { Injectable, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common'

export const RequireQuota = (_feature: string, _amount: number) => SetMetadata('quota', true)

@Injectable()
export class QuotaGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    // No-op guard for local development (quota checks disabled)
    return true
  }
}
