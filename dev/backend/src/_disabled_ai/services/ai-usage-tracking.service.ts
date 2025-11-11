import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface UsageTrackingData {
  provider: string;
  task_type: string;
  model?: string;
  tokens_used: number;
  cost: number;
  latency_ms: number;
  success: boolean;
  is_fallback?: boolean;
  error?: string;
}

@Injectable()
export class AIUsageTrackingService {
  private readonly logger = new Logger(AIUsageTrackingService.name);
  private costAlertThreshold = 100; // Alert if daily cost exceeds $100

  constructor(private prisma: PrismaService) {}

  async track(data: UsageTrackingData) {
    try {
      await this.prisma.aIUsageLog.create({
        data: {
          provider: data.provider,
          task_type: data.task_type,
          model: data.model,
          tokens_used: data.tokens_used,
          cost: data.cost,
          latency_ms: data.latency_ms,
          success: data.success,
          is_fallback: data.is_fallback || false,
          error_message: data.error,
        },
      });

      // Check daily costs
      await this.checkDailyCosts();
    } catch (error) {
      this.logger.error(`Failed to track AI usage: ${error.message}`);
    }
  }

  async getDailyStats(date: Date = new Date()) {
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const logs = await this.prisma.aIUsageLog.findMany({
      where: {
        created_at: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const stats = {
      totalCost: 0,
      totalTokens: 0,
      totalRequests: logs.length,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      byProvider: {} as Record<string, { cost: number; requests: number; tokens: number }>,
      byTaskType: {} as Record<string, { cost: number; requests: number }>,
    };

    let totalLatency = 0;

    logs.forEach(log => {
      stats.totalCost += log.cost;
      stats.totalTokens += log.tokens_used;
      totalLatency += log.latency_ms;

      if (log.success) {
        stats.successfulRequests++;
      } else {
        stats.failedRequests++;
      }

      // By provider
      if (!stats.byProvider[log.provider]) {
        stats.byProvider[log.provider] = { cost: 0, requests: 0, tokens: 0 };
      }
      stats.byProvider[log.provider].cost += log.cost;
      stats.byProvider[log.provider].requests++;
      stats.byProvider[log.provider].tokens += log.tokens_used;

      // By task type
      if (!stats.byTaskType[log.task_type]) {
        stats.byTaskType[log.task_type] = { cost: 0, requests: 0 };
      }
      stats.byTaskType[log.task_type].cost += log.cost;
      stats.byTaskType[log.task_type].requests++;
    });

    stats.averageLatency = logs.length > 0 ? totalLatency / logs.length : 0;

    return stats;
  }

  async getMonthlyStats(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const logs = await this.prisma.aIUsageLog.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalCost = logs.reduce((sum, log) => sum + log.cost, 0);
    const totalTokens = logs.reduce((sum, log) => sum + log.tokens_used, 0);

    return {
      year,
      month,
      totalCost,
      totalTokens,
      totalRequests: logs.length,
      successRate: logs.filter(l => l.success).length / logs.length,
    };
  }

  private async checkDailyCosts() {
    const stats = await this.getDailyStats();
    
    if (stats.totalCost > this.costAlertThreshold) {
      this.logger.warn(
        `Daily AI cost alert: $${stats.totalCost.toFixed(2)} exceeds threshold of $${this.costAlertThreshold}`,
      );
      // Could send email/Slack notification here
    }
  }

  async getCostByDateRange(startDate: Date, endDate: Date) {
    const logs = await this.prisma.aIUsageLog.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    // Group by date
    const dailyCosts: Record<string, number> = {};
    
    logs.forEach(log => {
      const date = log.created_at.toISOString().split('T')[0];
      dailyCosts[date] = (dailyCosts[date] || 0) + log.cost;
    });

    return Object.entries(dailyCosts).map(([date, cost]) => ({ date, cost }));
  }
}
