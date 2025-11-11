import { Controller, Get, Post, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { APIKeyService } from '../services/api-key.service';

@Controller('api-keys')
@UseGuards(JwtAuthGuard)
export class APIKeyController {
  constructor(private apiKeyService: APIKeyService) {}

  /**
   * Create API key
   * POST /api-keys
   */
  @Post()
  async createAPIKey(
    @CurrentUser() user: any,
    @Body() data: {
      organization_id: string;
      name: string;
      scopes: string[];
      rate_limit?: number;
      daily_quota?: number;
      expires_at?: string;
    },
  ) {
    const expiresAt = data.expires_at ? new Date(data.expires_at) : undefined;
    
    const apiKey = await this.apiKeyService.createAPIKey(
      data.organization_id,
      user.id,
      {
        name: data.name,
        scopes: data.scopes,
        rateLimit: data.rate_limit,
        dailyQuota: data.daily_quota,
        expiresAt,
      },
    );

    return apiKey;
  }

  /**
   * Get organization API keys
   * GET /api-keys/organization/:organizationId
   */
  @Get('organization/:organizationId')
  async getOrganizationKeys(@Param('organizationId') organizationId: string) {
    const keys = await this.apiKeyService.getOrganizationKeys(organizationId);
    return { keys };
  }

  /**
   * Revoke API key
   * DELETE /api-keys/:id
   */
  @Delete(':id')
  async revokeKey(@Param('id') id: string, @CurrentUser() user: any) {
    return this.apiKeyService.revokeKey(id, user.id);
  }

  /**
   * Get API key usage stats
   * GET /api-keys/:id/stats
   */
  @Get(':id/stats')
  async getUsageStats(@Param('id') id: string, @Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    const stats = await this.apiKeyService.getUsageStats(id, daysNum);
    
    return stats;
  }
}
