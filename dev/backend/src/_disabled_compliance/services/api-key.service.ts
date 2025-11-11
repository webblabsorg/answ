import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class APIKeyService {
  private readonly logger = new Logger(APIKeyService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generate new API key
   */
  async createAPIKey(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      scopes: string[];
      rateLimit?: number;
      dailyQuota?: number;
      expiresAt?: Date;
    },
  ) {
    // Generate random API key
    const keyString = `ak_${randomBytes(32).toString('hex')}`;
    const keyHash = createHash('sha256').update(keyString).digest('hex');

    const apiKey = await this.prisma.aPIKey.create({
      data: {
        organization_id: organizationId,
        created_by: userId,
        name: data.name,
        key_hash: keyHash,
        scopes: data.scopes,
        rate_limit: data.rateLimit || 100,
        daily_quota: data.dailyQuota || 10000,
        expires_at: data.expiresAt,
      },
    });

    this.logger.log(`API key created: ${apiKey.name} for org ${organizationId}`);

    // Return the actual key only once
    return {
      ...apiKey,
      key: keyString, // Only returned on creation
    };
  }

  /**
   * Validate API key
   */
  async validateKey(keyString: string): Promise<any> {
    const keyHash = createHash('sha256').update(keyString).digest('hex');

    const apiKey = await this.prisma.aPIKey.findUnique({
      where: { key_hash: keyHash },
      include: {
        organization: true,
      },
    });

    if (!apiKey) {
      throw new NotFoundException('Invalid API key');
    }

    if (!apiKey.is_active) {
      throw new BadRequestException('API key is inactive');
    }

    if (apiKey.expires_at && apiKey.expires_at < new Date()) {
      throw new BadRequestException('API key has expired');
    }

    // Update last used
    await this.prisma.aPIKey.update({
      where: { id: apiKey.id },
      data: { last_used_at: new Date() },
    });

    return apiKey;
  }

  /**
   * Check rate limit
   */
  async checkRateLimit(apiKeyId: string): Promise<boolean> {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    const recentRequests = await this.prisma.aPIKeyUsage.count({
      where: {
        api_key_id: apiKeyId,
        timestamp: {
          gte: oneMinuteAgo,
        },
      },
    });

    const apiKey = await this.prisma.aPIKey.findUnique({
      where: { id: apiKeyId },
    });

    if (!apiKey) {
      return false;
    }

    return recentRequests < apiKey.rate_limit;
  }

  /**
   * Check daily quota
   */
  async checkDailyQuota(apiKeyId: string): Promise<boolean> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayRequests = await this.prisma.aPIKeyUsage.count({
      where: {
        api_key_id: apiKeyId,
        timestamp: {
          gte: startOfDay,
        },
      },
    });

    const apiKey = await this.prisma.aPIKey.findUnique({
      where: { id: apiKeyId },
    });

    if (!apiKey) {
      return false;
    }

    return todayRequests < apiKey.daily_quota;
  }

  /**
   * Track API usage
   */
  async trackUsage(
    apiKeyId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
  ) {
    await this.prisma.aPIKeyUsage.create({
      data: {
        api_key_id: apiKeyId,
        endpoint,
        method,
        status_code: statusCode,
        response_time: responseTime,
      },
    });
  }

  /**
   * Get API keys for organization
   */
  async getOrganizationKeys(organizationId: string) {
    const keys = await this.prisma.aPIKey.findMany({
      where: { organization_id: organizationId },
      orderBy: { created_at: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            usage_records: true,
          },
        },
      },
    });

    // Don't return key_hash
    return keys.map(({ key_hash, ...key }) => key);
  }

  /**
   * Revoke API key
   */
  async revokeKey(apiKeyId: string, userId: string) {
    const apiKey = await this.prisma.aPIKey.findUnique({
      where: { id: apiKeyId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.aPIKey.update({
      where: { id: apiKeyId },
      data: { is_active: false },
    });

    this.logger.log(`API key revoked: ${apiKey.name} by user ${userId}`);

    return { message: 'API key revoked successfully' };
  }

  /**
   * Get API key usage statistics
   */
  async getUsageStats(apiKeyId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalRequests, successRequests, errorRequests, avgResponseTime] = await Promise.all([
      this.prisma.aPIKeyUsage.count({
        where: {
          api_key_id: apiKeyId,
          timestamp: { gte: startDate },
        },
      }),
      this.prisma.aPIKeyUsage.count({
        where: {
          api_key_id: apiKeyId,
          timestamp: { gte: startDate },
          status_code: { gte: 200, lt: 400 },
        },
      }),
      this.prisma.aPIKeyUsage.count({
        where: {
          api_key_id: apiKeyId,
          timestamp: { gte: startDate },
          status_code: { gte: 400 },
        },
      }),
      this.prisma.aPIKeyUsage.aggregate({
        where: {
          api_key_id: apiKeyId,
          timestamp: { gte: startDate },
        },
        _avg: {
          response_time: true,
        },
      }),
    ]);

    return {
      total_requests: totalRequests,
      success_requests: successRequests,
      error_requests: errorRequests,
      success_rate: totalRequests > 0 ? (successRequests / totalRequests) * 100 : 0,
      avg_response_time: avgResponseTime._avg.response_time || 0,
    };
  }
}
