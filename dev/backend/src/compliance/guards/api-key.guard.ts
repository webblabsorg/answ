import { CanActivate, ExecutionContext, Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { APIKeyService } from '../services/api-key.service';

@Injectable()
export class APIKeyGuard implements CanActivate {
  constructor(private apiKeyService: APIKeyService, private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const headerKey = (req.headers['x-api-key'] || req.headers['x-apikey']) as string;
    if (!headerKey) throw new BadRequestException('Missing x-api-key header');

    const apiKey = await this.apiKeyService.validateKey(headerKey);
    const withinRate = await this.apiKeyService.checkRateLimit(apiKey.id);
    if (!withinRate) throw new ForbiddenException('Rate limit exceeded');
    const withinQuota = await this.apiKeyService.checkDailyQuota(apiKey.id);
    if (!withinQuota) throw new ForbiddenException('Daily quota exceeded');

    // Attach to request for handlers to use
    req.apiKey = apiKey;
    req.organizationId = apiKey.organization_id;
    return true;
  }
}
