import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionService } from './subscription.service';

export type FeatureType = 
  | 'test' 
  | 'ai_tutor' 
  | 'question_generation' 
  | 'voice_input' 
  | 'api_request';

export interface UsageLimits {
  tests_per_month: number;
  ai_tutor_messages: number;
  question_generations: number;
  exams_access: number;
  voice_input: boolean;
  api_access: boolean;
}

export interface CurrentUsage {
  tests: number;
  ai_tutor_messages: number;
  question_generations: number;
  api_requests: number;
}

@Injectable()
export class UsageTrackingService {
  private readonly logger = new Logger(UsageTrackingService.name);

  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) {}

  /**
   * Track feature usage for a user
   */
  async trackUsage(userId: string, featureType: FeatureType, count = 1): Promise<void> {
    try {
      const now = new Date();
      const periodStart = this.getMonthStart(now);
      const periodEnd = this.getMonthEnd(now);

      await this.prisma.usageRecord.create({
        data: {
          user_id: userId,
          feature_type: featureType,
          count,
          period_start: periodStart,
          period_end: periodEnd,
        },
      });

      this.logger.log(`Tracked ${featureType} usage for user ${userId}: ${count}`);
    } catch (error) {
      this.logger.error(`Failed to track usage for user ${userId}:`, error);
      // Don't throw - usage tracking failures shouldn't block features
    }
  }

  /**
   * Get current month's usage for a user
   */
  async getCurrentUsage(userId: string): Promise<CurrentUsage> {
    const now = new Date();
    const periodStart = this.getMonthStart(now);
    const periodEnd = this.getMonthEnd(now);

    const records = await this.prisma.usageRecord.findMany({
      where: {
        user_id: userId,
        period_start: { gte: periodStart },
        period_end: { lte: periodEnd },
      },
    });

    const usage: CurrentUsage = {
      tests: 0,
      ai_tutor_messages: 0,
      question_generations: 0,
      api_requests: 0,
    };

    records.forEach((record) => {
      switch (record.feature_type) {
        case 'test':
          usage.tests += record.count;
          break;
        case 'ai_tutor':
          usage.ai_tutor_messages += record.count;
          break;
        case 'question_generation':
          usage.question_generations += record.count;
          break;
        case 'api_request':
          usage.api_requests += record.count;
          break;
      }
    });

    return usage;
  }

  /**
   * Check if user can use a feature based on their tier limits
   */
  async canUseFeature(
    userId: string,
    featureType: FeatureType,
    amount = 1,
  ): Promise<{ allowed: boolean; reason?: string; usage?: CurrentUsage; limits?: UsageLimits }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscriptions: { where: { status: 'ACTIVE' }, take: 1 } },
    });

    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    const tier = user.tier;
    const limits = this.subscriptionService.getTierLimits(tier);
    const usage = await this.getCurrentUsage(userId);

    // Check specific feature limits
    switch (featureType) {
      case 'test':
        if (limits.tests_per_month === -1) {
          return { allowed: true, usage, limits };
        }
        if (usage.tests + amount > limits.tests_per_month) {
          return {
            allowed: false,
            reason: `Monthly test limit reached (${limits.tests_per_month})`,
            usage,
            limits,
          };
        }
        break;

      case 'ai_tutor':
        if (limits.ai_tutor_messages === -1) {
          return { allowed: true, usage, limits };
        }
        if (usage.ai_tutor_messages + amount > limits.ai_tutor_messages) {
          return {
            allowed: false,
            reason: `Monthly AI tutor message limit reached (${limits.ai_tutor_messages})`,
            usage,
            limits,
          };
        }
        break;

      case 'question_generation':
        if (limits.question_generations === -1) {
          return { allowed: true, usage, limits };
        }
        if (limits.question_generations === 0) {
          return {
            allowed: false,
            reason: 'Question generation not available in your plan',
            usage,
            limits,
          };
        }
        if (usage.question_generations + amount > limits.question_generations) {
          return {
            allowed: false,
            reason: `Monthly question generation limit reached (${limits.question_generations})`,
            usage,
            limits,
          };
        }
        break;

      case 'voice_input':
        if (!limits.voice_input) {
          return {
            allowed: false,
            reason: 'Voice input not available in your plan',
            usage,
            limits,
          };
        }
        break;

      case 'api_request':
        if (!limits.api_access) {
          return {
            allowed: false,
            reason: 'API access not available in your plan',
            usage,
            limits,
          };
        }
        break;
    }

    return { allowed: true, usage, limits };
  }

  /**
   * Get usage statistics for a user
   */
  async getUsageStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const limits = this.subscriptionService.getTierLimits(user.tier);
    const currentUsage = await this.getCurrentUsage(userId);

    // Calculate percentages
    const getPercentage = (used: number, limit: number) => {
      if (limit === -1) return 0; // unlimited
      return Math.round((used / limit) * 100);
    };

    return {
      tier: user.tier,
      limits,
      current: currentUsage,
      percentages: {
        tests: getPercentage(currentUsage.tests, limits.tests_per_month),
        ai_tutor_messages: getPercentage(currentUsage.ai_tutor_messages, limits.ai_tutor_messages),
        question_generations: getPercentage(
          currentUsage.question_generations,
          limits.question_generations || 1,
        ),
      },
      warnings: this.generateWarnings(currentUsage, limits),
    };
  }

  /**
   * Get usage history for a user (last N months)
   */
  async getUsageHistory(userId: string, months = 3) {
    const history = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const periodStart = this.getMonthStart(targetDate);
      const periodEnd = this.getMonthEnd(targetDate);

      const records = await this.prisma.usageRecord.findMany({
        where: {
          user_id: userId,
          period_start: { gte: periodStart },
          period_end: { lte: periodEnd },
        },
      });

      const monthUsage = {
        tests: 0,
        ai_tutor_messages: 0,
        question_generations: 0,
        api_requests: 0,
      };

      records.forEach((record) => {
        switch (record.feature_type) {
          case 'test':
            monthUsage.tests += record.count;
            break;
          case 'ai_tutor':
            monthUsage.ai_tutor_messages += record.count;
            break;
          case 'question_generation':
            monthUsage.question_generations += record.count;
            break;
          case 'api_request':
            monthUsage.api_requests += record.count;
            break;
        }
      });

      history.push({
        month: targetDate.toISOString().substring(0, 7), // YYYY-MM
        ...monthUsage,
      });
    }

    return history.reverse(); // oldest to newest
  }

  /**
   * Reset usage for testing purposes (admin only)
   */
  async resetUsage(userId: string): Promise<void> {
    const now = new Date();
    const periodStart = this.getMonthStart(now);
    const periodEnd = this.getMonthEnd(now);

    await this.prisma.usageRecord.deleteMany({
      where: {
        user_id: userId,
        period_start: { gte: periodStart },
        period_end: { lte: periodEnd },
      },
    });

    this.logger.log(`Reset usage for user ${userId}`);
  }

  /**
   * Helper: Get start of month
   */
  private getMonthStart(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  /**
   * Helper: Get end of month
   */
  private getMonthEnd(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  /**
   * Helper: Generate usage warnings
   */
  private generateWarnings(usage: CurrentUsage, limits: UsageLimits): string[] {
    const warnings: string[] = [];
    const threshold = 0.8; // 80%

    if (limits.tests_per_month !== -1) {
      const percentage = usage.tests / limits.tests_per_month;
      if (percentage >= threshold) {
        warnings.push(
          `You've used ${Math.round(percentage * 100)}% of your monthly test limit`,
        );
      }
    }

    if (limits.ai_tutor_messages !== -1) {
      const percentage = usage.ai_tutor_messages / limits.ai_tutor_messages;
      if (percentage >= threshold) {
        warnings.push(
          `You've used ${Math.round(percentage * 100)}% of your monthly AI tutor message limit`,
        );
      }
    }

    if (limits.question_generations > 0) {
      const percentage = usage.question_generations / limits.question_generations;
      if (percentage >= threshold) {
        warnings.push(
          `You've used ${Math.round(percentage * 100)}% of your monthly question generation limit`,
        );
      }
    }

    return warnings;
  }

  /**
   * Get aggregated usage stats for admin dashboard
   */
  async getAggregatedStats(startDate?: Date, endDate?: Date) {
    const start = startDate || this.getMonthStart(new Date());
    const end = endDate || this.getMonthEnd(new Date());

    const records = await this.prisma.usageRecord.findMany({
      where: {
        created_at: { gte: start, lte: end },
      },
      include: {
        user: {
          select: {
            tier: true,
          },
        },
      },
    });

    // Aggregate by feature type and tier
    const stats: Record<string, any> = {
      total: {
        tests: 0,
        ai_tutor_messages: 0,
        question_generations: 0,
        api_requests: 0,
      },
      by_tier: {},
    };

    records.forEach((record) => {
      const tier = record.user.tier;
      const feature = record.feature_type;

      // Total stats
      if (feature === 'test') stats.total.tests += record.count;
      if (feature === 'ai_tutor') stats.total.ai_tutor_messages += record.count;
      if (feature === 'question_generation') stats.total.question_generations += record.count;
      if (feature === 'api_request') stats.total.api_requests += record.count;

      // By tier stats
      if (!stats.by_tier[tier]) {
        stats.by_tier[tier] = {
          tests: 0,
          ai_tutor_messages: 0,
          question_generations: 0,
          api_requests: 0,
        };
      }
      if (feature === 'test') stats.by_tier[tier].tests += record.count;
      if (feature === 'ai_tutor') stats.by_tier[tier].ai_tutor_messages += record.count;
      if (feature === 'question_generation')
        stats.by_tier[tier].question_generations += record.count;
      if (feature === 'api_request') stats.by_tier[tier].api_requests += record.count;
    });

    return stats;
  }
}
