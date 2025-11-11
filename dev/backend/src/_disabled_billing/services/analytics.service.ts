import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface RevenueMetrics {
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  totalRevenue: number;
  activeSubscriptions: number;
  newSubscriptions: number;
  canceledSubscriptions: number;
  churnRate: number;
  ltv: number; // Customer Lifetime Value
  arpu: number; // Average Revenue Per User
}

export interface UserGrowthMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  churnedUsers: number;
  growthRate: number;
  usersByTier: Record<string, number>;
}

export interface EngagementMetrics {
  totalTests: number;
  totalAITutorMessages: number;
  totalQuestionGenerations: number;
  avgTestsPerUser: number;
  avgAIMessagesPerUser: number;
  dau: number; // Daily Active Users
  mau: number; // Monthly Active Users
  engagementRate: number;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get revenue metrics
   */
  async getRevenueMetrics(startDate?: Date, endDate?: Date): Promise<RevenueMetrics> {
    const start = startDate || this.getMonthStart(new Date());
    const end = endDate || new Date();

    // Get active subscriptions
    const activeSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        created_at: { lte: end },
      },
      include: {
        user: true,
      },
    });

    // Calculate MRR (Monthly Recurring Revenue)
    const tierPricing = {
      STARTER: 0,
      GROW: 29,
      SCALE: 99,
      ENTERPRISE: 200,
    } as const;

    const mrr = activeSubscriptions.reduce((sum, sub) => {
      return sum + (tierPricing[sub.tier] || 0);
    }, 0);

    // Calculate ARR (Annual Recurring Revenue)
    const arr = mrr * 12;

    // Get new subscriptions in period
    const newSubscriptions = await this.prisma.subscription.count({
      where: {
        created_at: { gte: start, lte: end },
        status: { not: 'CANCELED' },
      },
    });

    // Get canceled subscriptions in period
    const canceledSubscriptions = await this.prisma.subscription.count({
      where: {
        canceled_at: { gte: start, lte: end },
      },
    });

    // Calculate churn rate
    const totalAtStart = await this.prisma.subscription.count({
      where: {
        created_at: { lt: start },
        status: 'ACTIVE',
      },
    });

    const churnRate = totalAtStart > 0 ? (canceledSubscriptions / totalAtStart) * 100 : 0;

    // Calculate ARPU (Average Revenue Per User)
    const totalUsers = await this.prisma.user.count({
      where: {
        created_at: { lte: end },
      },
    });

    const arpu = totalUsers > 0 ? mrr / totalUsers : 0;

    // Calculate LTV (Customer Lifetime Value)
    // LTV = ARPU / Churn Rate (monthly)
    const monthlyChurnRate = churnRate / 100;
    const ltv = monthlyChurnRate > 0 ? arpu / monthlyChurnRate : arpu * 12;

    // Calculate total revenue from invoices
    const invoices = await this.prisma.invoice.findMany({
      where: {
        paid_at: { gte: start, lte: end },
        status: 'paid',
      },
    });

    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.amount_paid, 0) / 100; // Convert cents to dollars

    return {
      mrr,
      arr,
      totalRevenue,
      activeSubscriptions: activeSubscriptions.length,
      newSubscriptions,
      canceledSubscriptions,
      churnRate: Math.round(churnRate * 100) / 100,
      ltv: Math.round(ltv * 100) / 100,
      arpu: Math.round(arpu * 100) / 100,
    };
  }

  /**
   * Get user growth metrics
   */
  async getUserGrowthMetrics(startDate?: Date, endDate?: Date): Promise<UserGrowthMetrics> {
    const start = startDate || this.getMonthStart(new Date());
    const end = endDate || new Date();

    // Total users
    const totalUsers = await this.prisma.user.count({
      where: {
        created_at: { lte: end },
      },
    });

    // New users in period
    const newUsers = await this.prisma.user.count({
      where: {
        created_at: { gte: start, lte: end },
      },
    });

    // Active users (users with activity in period)
    const activeUsers = await this.prisma.user.count({
      where: {
        OR: [
          {
            test_sessions: {
              some: {
                created_at: { gte: start, lte: end },
              },
            },
          },
          {
            conversations: {
              some: {
                updated_at: { gte: start, lte: end },
              },
            },
          },
        ],
      },
    });

    // Churned users (users with canceled subscriptions who haven't been active)
    const churnedUsers = await this.prisma.user.count({
      where: {
        subscriptions: {
          some: {
            canceled_at: { gte: start, lte: end },
          },
        },
        test_sessions: {
          none: {
            created_at: { gte: start, lte: end },
          },
        },
      },
    });

    // Growth rate
    const usersAtStart = await this.prisma.user.count({
      where: {
        created_at: { lt: start },
      },
    });

    const growthRate = usersAtStart > 0 ? ((newUsers - churnedUsers) / usersAtStart) * 100 : 0;

    // Users by tier
    const usersByTier = await this.prisma.user.groupBy({
      by: ['tier'],
      _count: { _all: true },
    });

    const tierCounts: Record<string, number> = {};
    usersByTier.forEach((group) => {
      // Prisma returns _count as an object when using groupBy; use _all for total
      tierCounts[group.tier] = (group as any)._count?._all ?? 0;
    });

    return {
      totalUsers,
      activeUsers,
      newUsers,
      churnedUsers,
      growthRate: Math.round(growthRate * 100) / 100,
      usersByTier: tierCounts,
    };
  }

  /**
   * Get engagement metrics
   */
  async getEngagementMetrics(startDate?: Date, endDate?: Date): Promise<EngagementMetrics> {
    const start = startDate || this.getMonthStart(new Date());
    const end = endDate || new Date();

    // Total tests
    const totalTests = await this.prisma.testSession.count({
      where: {
        created_at: { gte: start, lte: end },
      },
    });

    // Total AI tutor messages
    const totalAITutorMessages = await this.prisma.conversationMessage.count({
      where: {
        created_at: { gte: start, lte: end },
        role: 'user',
      },
    });

    // Total question generations
    const totalQuestionGenerations = await this.prisma.generatedQuestion.count({
      where: {
        created_at: { gte: start, lte: end },
      },
    });

    // Active users
    const activeUsers = await this.prisma.user.count({
      where: {
        OR: [
          {
            test_sessions: {
              some: {
                created_at: { gte: start, lte: end },
              },
            },
          },
          {
            conversations: {
              some: {
                updated_at: { gte: start, lte: end },
              },
            },
          },
        ],
      },
    });

    const totalUsers = await this.prisma.user.count();

    // Average per user
    const avgTestsPerUser = activeUsers > 0 ? totalTests / activeUsers : 0;
    const avgAIMessagesPerUser = activeUsers > 0 ? totalAITutorMessages / activeUsers : 0;

    // DAU (Daily Active Users) - last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dau = await this.prisma.user.count({
      where: {
        OR: [
          {
            test_sessions: {
              some: {
                created_at: { gte: yesterday },
              },
            },
          },
          {
            conversations: {
              some: {
                updated_at: { gte: yesterday },
              },
            },
          },
        ],
      },
    });

    // MAU (Monthly Active Users)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const mau = await this.prisma.user.count({
      where: {
        OR: [
          {
            test_sessions: {
              some: {
                created_at: { gte: thirtyDaysAgo },
              },
            },
          },
          {
            conversations: {
              some: {
                updated_at: { gte: thirtyDaysAgo },
              },
            },
          },
        ],
      },
    });

    // Engagement rate (MAU / Total Users)
    const engagementRate = totalUsers > 0 ? (mau / totalUsers) * 100 : 0;

    return {
      totalTests,
      totalAITutorMessages,
      totalQuestionGenerations,
      avgTestsPerUser: Math.round(avgTestsPerUser * 100) / 100,
      avgAIMessagesPerUser: Math.round(avgAIMessagesPerUser * 100) / 100,
      dau,
      mau,
      engagementRate: Math.round(engagementRate * 100) / 100,
    };
  }

  /**
   * Get revenue trend over time (last N months)
   */
  async getRevenueTrend(months = 12): Promise<Array<{ month: string; mrr: number; arr: number }>> {
    const trend = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = this.getMonthStart(targetDate);
      const end = this.getMonthEnd(targetDate);

      const metrics = await this.getRevenueMetrics(start, end);

      trend.push({
        month: targetDate.toISOString().substring(0, 7), // YYYY-MM
        mrr: metrics.mrr,
        arr: metrics.arr,
      });
    }

    return trend;
  }

  /**
   * Get user growth trend over time (last N months)
   */
  async getUserGrowthTrend(months = 12): Promise<Array<{ month: string; total: number; new: number; active: number }>> {
    const trend = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = this.getMonthStart(targetDate);
      const end = this.getMonthEnd(targetDate);

      const metrics = await this.getUserGrowthMetrics(start, end);

      // Total users at end of month
      const totalAtMonth = await this.prisma.user.count({
        where: {
          created_at: { lte: end },
        },
      });

      trend.push({
        month: targetDate.toISOString().substring(0, 7),
        total: totalAtMonth,
        new: metrics.newUsers,
        active: metrics.activeUsers,
      });
    }

    return trend;
  }

  /**
   * Get engagement trend over time (last N months)
   */
  async getEngagementTrend(months = 12): Promise<Array<{ month: string; tests: number; aiMessages: number; mau: number }>> {
    const trend = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = this.getMonthStart(targetDate);
      const end = this.getMonthEnd(targetDate);

      const metrics = await this.getEngagementMetrics(start, end);

      trend.push({
        month: targetDate.toISOString().substring(0, 7),
        tests: metrics.totalTests,
        aiMessages: metrics.totalAITutorMessages,
        mau: metrics.mau,
      });
    }

    return trend;
  }

  /**
   * Get cohort analysis (retention by signup month)
   */
  async getCohortAnalysis(months = 6): Promise<any[]> {
    const cohorts = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const cohortDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const cohortStart = this.getMonthStart(cohortDate);
      const cohortEnd = this.getMonthEnd(cohortDate);

      // Users who signed up in this month
      const cohortUsers = await this.prisma.user.findMany({
        where: {
          created_at: { gte: cohortStart, lte: cohortEnd },
        },
        select: { id: true },
      });

      const cohortUserIds = cohortUsers.map((u) => u.id);
      const cohortSize = cohortUserIds.length;

      if (cohortSize === 0) {
        continue;
      }

      // Check retention in subsequent months
      const retention = [];
      for (let j = 0; j <= Math.min(5, months - i - 1); j++) {
        const checkDate = new Date(cohortDate.getFullYear(), cohortDate.getMonth() + j + 1, 1);
        const checkStart = this.getMonthStart(checkDate);
        const checkEnd = this.getMonthEnd(checkDate);

        // Count how many of the cohort were active in this month
        const activeCount = await this.prisma.user.count({
          where: {
            id: { in: cohortUserIds },
            OR: [
              {
                test_sessions: {
                  some: {
                    created_at: { gte: checkStart, lte: checkEnd },
                  },
                },
              },
              {
                conversations: {
                  some: {
                    updated_at: { gte: checkStart, lte: checkEnd },
                  },
                },
              },
            ],
          },
        });

        retention.push({
          month: j + 1,
          rate: Math.round((activeCount / cohortSize) * 100 * 100) / 100,
        });
      }

      cohorts.push({
        cohort: cohortDate.toISOString().substring(0, 7),
        size: cohortSize,
        retention,
      });
    }

    return cohorts;
  }

  /**
   * Get top performing exams
   */
  async getTopExams(limit = 10): Promise<Array<{ exam: string; tests: number; avgScore: number }>> {
    const exams = await this.prisma.exam.findMany({
      where: { is_active: true },
      include: {
        test_sessions: {
          where: {
            status: 'COMPLETED',
          },
          select: {
            raw_score: true,
          },
        },
      },
    });

    const examStats = exams
      .map((exam) => {
        const tests = exam.test_sessions.length;
        const avgScore =
          tests > 0
            ? exam.test_sessions.reduce((sum, session) => sum + (session.raw_score || 0), 0) / tests
            : 0;

        return {
          exam: exam.name,
          tests,
          avgScore: Math.round(avgScore * 100) / 100,
        };
      })
      .sort((a, b) => b.tests - a.tests)
      .slice(0, limit);

    return examStats;
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
   * Export analytics data to CSV format
   */
  async exportToCSV(type: 'revenue' | 'users' | 'engagement', months = 12): Promise<string> {
    let data: any[];
    let headers: string[];

    switch (type) {
      case 'revenue':
        data = await this.getRevenueTrend(months);
        headers = ['Month', 'MRR', 'ARR'];
        break;
      case 'users':
        data = await this.getUserGrowthTrend(months);
        headers = ['Month', 'Total Users', 'New Users', 'Active Users'];
        break;
      case 'engagement':
        data = await this.getEngagementTrend(months);
        headers = ['Month', 'Tests', 'AI Messages', 'MAU'];
        break;
      default:
        throw new Error('Invalid export type');
    }

    // Generate CSV
    const csv = [headers.join(',')];
    data.forEach((row) => {
      const values = Object.values(row);
      csv.push(values.join(','));
    });

    return csv.join('\n');
  }
}
