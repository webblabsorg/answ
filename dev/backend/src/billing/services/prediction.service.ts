import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';
import { UsageTrackingService } from './usage-tracking.service';

export interface ChurnPrediction {
  userId: string;
  userName: string;
  email: string;
  tier: string;
  churnProbability: number; // 0-100
  churnRisk: 'low' | 'medium' | 'high';
  factors: string[];
  recommendations: string[];
  lastActive: Date;
}

export interface UsageForecast {
  userId: string;
  userName: string;
  currentUsage: {
    tests: number;
    aiMessages: number;
  };
  forecast: {
    testsNextMonth: number;
    aiMessagesNextMonth: number;
  };
  limitWarnings: string[];
}

export interface UpsellRecommendation {
  userId: string;
  userName: string;
  email: string;
  currentTier: string;
  recommendedTier: string;
  confidence: number; // 0-100
  reasons: string[];
  potentialRevenue: number; // Monthly
  engagementScore: number;
}

export interface PredictionInsights {
  churnPredictions: ChurnPrediction[];
  usageForecasts: UsageForecast[];
  upsellRecommendations: UpsellRecommendation[];
  summary: {
    totalAtRisk: number;
    totalUpsellOpportunities: number;
    potentialRevenueLoss: number;
    potentialRevenueGain: number;
  };
}

@Injectable()
export class PredictionService {
  private readonly logger = new Logger(PredictionService.name);

  constructor(
    private prisma: PrismaService,
    private analyticsService: AnalyticsService,
    private usageTracking: UsageTrackingService,
  ) {}

  /**
   * Predict churn risk for all paid subscribers
   */
  async predictChurn(limit = 50): Promise<ChurnPrediction[]> {
    const paidUsers = await this.prisma.user.findMany({
      where: {
        tier: { not: 'STARTER' },
        subscriptions: {
          some: {
            status: 'ACTIVE',
          },
        },
      },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          take: 1,
        },
        test_sessions: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
        conversations: {
          orderBy: { updated_at: 'desc' },
          take: 1,
        },
      },
      take: limit,
    });

    const predictions: ChurnPrediction[] = [];

    for (const user of paidUsers) {
      const prediction = await this.calculateChurnRisk(user);
      if (prediction) {
        predictions.push(prediction);
      }
    }

    // Sort by churn probability (highest first)
    return predictions.sort((a, b) => b.churnProbability - a.churnProbability);
  }

  /**
   * Calculate churn risk for a specific user
   */
  private async calculateChurnRisk(user: any): Promise<ChurnPrediction | null> {
    const factors: string[] = [];
    let riskScore = 0;

    // Get last activity
    const lastTestSession = user.test_sessions[0];
    const lastConversation = user.conversations[0];

    const lastTestDate = lastTestSession?.created_at;
    const lastConvoDate = lastConversation?.updated_at;

    const lastActivity = [lastTestDate, lastConvoDate]
      .filter(Boolean)
      .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0];

    if (!lastActivity) {
      return null;
    }

    const daysSinceActivity = Math.floor(
      (Date.now() - (lastActivity as Date).getTime()) / (1000 * 60 * 60 * 24),
    );

    // Factor 1: Inactivity (40% weight)
    if (daysSinceActivity > 30) {
      riskScore += 40;
      factors.push(`Inactive for ${daysSinceActivity} days`);
    } else if (daysSinceActivity > 14) {
      riskScore += 20;
      factors.push(`Low activity (${daysSinceActivity} days since last use)`);
    }

    // Factor 2: Usage decline (30% weight)
    const currentMonth = await this.usageTracking.getCurrentUsage(user.id);
    const avgUsage = {
      tests: currentMonth.tests,
      aiMessages: currentMonth.ai_tutor_messages,
    };

    if (avgUsage.tests === 0 && avgUsage.aiMessages === 0) {
      riskScore += 30;
      factors.push('No usage this month');
    } else if (avgUsage.tests < 2 && avgUsage.aiMessages < 10) {
      riskScore += 15;
      factors.push('Very low usage this month');
    }

    // Factor 3: Subscription age (15% weight)
    const subscription = user.subscriptions[0];
    const subscriptionAge = Math.floor(
      (Date.now() - subscription.created_at.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (subscriptionAge < 30 && daysSinceActivity > 7) {
      riskScore += 15;
      factors.push('New subscriber with low engagement');
    }

    // Factor 4: Cancel signal (15% weight)
    if (subscription.cancel_at_period_end) {
      riskScore += 15;
      factors.push('Subscription set to cancel');
    }

    const churnProbability = Math.min(100, riskScore);
    const churnRisk: 'low' | 'medium' | 'high' =
      churnProbability >= 70 ? 'high' : churnProbability >= 40 ? 'medium' : 'low';

    const recommendations = this.generateChurnRecommendations(factors, user.tier);

    return {
      userId: user.id,
      userName: user.name,
      email: user.email,
      tier: user.tier,
      churnProbability: Math.round(churnProbability),
      churnRisk,
      factors,
      recommendations,
      lastActive: lastActivity as Date,
    };
  }

  /**
   * Generate recommendations to reduce churn
   */
  private generateChurnRecommendations(factors: string[], tier: string): string[] {
    const recommendations: string[] = [];

    if (factors.some((f) => f.includes('Inactive') || f.includes('Low activity'))) {
      recommendations.push('Send re-engagement email with study tips');
      recommendations.push('Offer personalized AI tutor session');
      recommendations.push('Highlight new features or content');
    }

    if (factors.some((f) => f.includes('No usage'))) {
      recommendations.push('Offer discount to continue subscription');
      recommendations.push('Schedule check-in call with support');
      recommendations.push('Provide onboarding resources');
    }

    if (factors.some((f) => f.includes('New subscriber'))) {
      recommendations.push('Improve onboarding experience');
      recommendations.push('Send getting started guide');
      recommendations.push('Offer 1-on-1 demo or tutorial');
    }

    if (factors.some((f) => f.includes('cancel'))) {
      recommendations.push('Contact user to understand reasons');
      recommendations.push('Offer retention discount');
      recommendations.push('Propose downgrade instead of cancel');
    }

    return recommendations.slice(0, 3); // Top 3 recommendations
  }

  /**
   * Forecast usage for users approaching limits
   */
  async forecastUsage(limit = 50): Promise<UsageForecast[]> {
    const starterUsers = await this.prisma.user.findMany({
      where: { tier: 'STARTER' },
      take: limit,
    });

    const forecasts: UsageForecast[] = [];

    for (const user of starterUsers) {
      const forecast = await this.calculateUsageForecast(user);
      if (forecast) {
        forecasts.push(forecast);
      }
    }

    // Sort by users most likely to hit limits
    return forecasts.sort((a, b) => {
      const aTotal = a.forecast.testsNextMonth + a.forecast.aiMessagesNextMonth;
      const bTotal = b.forecast.testsNextMonth + b.forecast.aiMessagesNextMonth;
      return bTotal - aTotal;
    });
  }

  /**
   * Calculate usage forecast for a user
   */
  private async calculateUsageForecast(user: any): Promise<UsageForecast | null> {
    const currentUsage = await this.usageTracking.getCurrentUsage(user.id);
    const limits = this.usageTracking['subscriptionService'].getTierLimits(user.tier);

    // Get usage from last 3 months for trend
    const history = await this.usageTracking.getUsageHistory(user.id, 3);

    if (history.length === 0) {
      return null;
    }

    // Calculate trend
    const testsPerMonth = history.map((h: any) => h.tests);
    const aiMessagesPerMonth = history.map((h: any) => h.ai_tutor_messages);

    const avgTests = testsPerMonth.reduce((sum: number, v: number) => sum + v, 0) / testsPerMonth.length;
    const avgAI = aiMessagesPerMonth.reduce((sum: number, v: number) => sum + v, 0) / aiMessagesPerMonth.length;

    // Simple linear forecast (could be enhanced with more sophisticated models)
    const forecastTests = Math.round(avgTests * 1.2); // Assume 20% growth
    const forecastAI = Math.round(avgAI * 1.2);

    const warnings: string[] = [];

    if (limits.tests_per_month !== -1 && forecastTests >= limits.tests_per_month * 0.8) {
      warnings.push(`Likely to use ${forecastTests} tests (limit: ${limits.tests_per_month})`);
    }

    if (limits.ai_tutor_messages !== -1 && forecastAI >= limits.ai_tutor_messages * 0.8) {
      warnings.push(`Likely to use ${forecastAI} AI messages (limit: ${limits.ai_tutor_messages})`);
    }

    if (warnings.length === 0) {
      return null; // Not approaching limits
    }

    return {
      userId: user.id,
      userName: user.name,
      currentUsage: {
        tests: currentUsage.tests,
        aiMessages: currentUsage.ai_tutor_messages,
      },
      forecast: {
        testsNextMonth: forecastTests,
        aiMessagesNextMonth: forecastAI,
      },
      limitWarnings: warnings,
    };
  }

  /**
   * Generate upsell recommendations
   */
  async generateUpsellRecommendations(limit = 50): Promise<UpsellRecommendation[]> {
    const users = await this.prisma.user.findMany({
      where: {
        tier: { in: ['STARTER', 'GROW', 'SCALE'] },
      },
      take: limit * 2, // Get more to filter down
    });

    const recommendations: UpsellRecommendation[] = [];

    for (const user of users) {
      const recommendation = await this.calculateUpsellRecommendation(user);
      if (recommendation && recommendation.confidence >= 60) {
        recommendations.push(recommendation);
      }
    }

    // Sort by confidence and potential revenue
    return recommendations
      .sort((a, b) => {
        const aScore = a.confidence * a.potentialRevenue;
        const bScore = b.confidence * b.potentialRevenue;
        return bScore - aScore;
      })
      .slice(0, limit);
  }

  /**
   * Calculate upsell recommendation for a user
   */
  private async calculateUpsellRecommendation(user: any): Promise<UpsellRecommendation | null> {
    const currentUsage = await this.usageTracking.getCurrentUsage(user.id);
    const currentLimits = this.usageTracking['subscriptionService'].getTierLimits(user.tier);
    const stats = await this.usageTracking.getUsageStats(user.id);

    const reasons: string[] = [];
    let confidenceScore = 0;
    let recommendedTier = user.tier;

    // Analyze usage patterns
    const testUsage = currentLimits.tests_per_month !== -1
      ? (currentUsage.tests / currentLimits.tests_per_month) * 100
      : 0;

    const aiUsage = currentLimits.ai_tutor_messages !== -1
      ? (currentUsage.ai_tutor_messages / currentLimits.ai_tutor_messages) * 100
      : 0;

    // STARTER → GROW recommendations
    if (user.tier === 'STARTER') {
      if (testUsage >= 80) {
        confidenceScore += 40;
        reasons.push(`Using ${Math.round(testUsage)}% of test limit`);
        recommendedTier = 'GROW';
      }

      if (aiUsage >= 80) {
        confidenceScore += 40;
        reasons.push(`Using ${Math.round(aiUsage)}% of AI tutor limit`);
        recommendedTier = 'GROW';
      }

      if (currentUsage.tests >= 8 && currentUsage.ai_tutor_messages >= 15) {
        confidenceScore += 20;
        reasons.push('High engagement across features');
        recommendedTier = 'GROW';
      }
    }

    // GROW → SCALE recommendations
    if (user.tier === 'GROW') {
      const genUsage = currentLimits.question_generations !== -1
        ? (currentUsage.question_generations / currentLimits.question_generations) * 100
        : 0;

      if (genUsage >= 80) {
        confidenceScore += 50;
        reasons.push(`Using ${Math.round(genUsage)}% of question generation limit`);
        recommendedTier = 'SCALE';
      }

      if (currentUsage.tests >= 20 && currentUsage.ai_tutor_messages >= 50) {
        confidenceScore += 30;
        reasons.push('Power user - would benefit from unlimited features');
        recommendedTier = 'SCALE';
      }
    }

    // SCALE → ENTERPRISE recommendations
    if (user.tier === 'SCALE') {
      // Check for enterprise needs (this would need custom logic)
      if (currentUsage.tests >= 50) {
        confidenceScore += 20;
        reasons.push('High volume usage suitable for enterprise');
        recommendedTier = 'ENTERPRISE';
      }
    }

    if (confidenceScore === 0 || recommendedTier === user.tier) {
      return null;
    }

    const tierPricing = {
      STARTER: 0,
      GROW: 29,
      SCALE: 99,
      ENTERPRISE: 200,
    } as const;

    const potentialRevenue = tierPricing[recommendedTier] - tierPricing[user.tier];
    const engagementScore = Math.min(100, (currentUsage.tests * 2) + (currentUsage.ai_tutor_messages * 0.5));

    return {
      userId: user.id,
      userName: user.name,
      email: user.email,
      currentTier: user.tier,
      recommendedTier,
      confidence: Math.min(100, confidenceScore),
      reasons,
      potentialRevenue,
      engagementScore: Math.round(engagementScore),
    };
  }

  /**
   * Get comprehensive prediction insights
   */
  async getPredictionInsights(): Promise<PredictionInsights> {
    const [churnPredictions, usageForecasts, upsellRecommendations] = await Promise.all([
      this.predictChurn(50),
      this.forecastUsage(50),
      this.generateUpsellRecommendations(50),
    ]);

    const highRiskChurn = churnPredictions.filter((p) => p.churnRisk === 'high');

    const tierPricing = {
      STARTER: 0,
      GROW: 29,
      SCALE: 99,
      ENTERPRISE: 200,
    } as const;

    const potentialRevenueLoss = highRiskChurn.reduce(
      (sum, p) => sum + (tierPricing[p.tier] || 0),
      0,
    );

    const potentialRevenueGain = upsellRecommendations
      .filter((r) => r.confidence >= 70)
      .reduce((sum, r) => sum + r.potentialRevenue, 0);

    return {
      churnPredictions,
      usageForecasts,
      upsellRecommendations,
      summary: {
        totalAtRisk: highRiskChurn.length,
        totalUpsellOpportunities: upsellRecommendations.filter((r) => r.confidence >= 70).length,
        potentialRevenueLoss,
        potentialRevenueGain,
      },
    };
  }

  /**
   * Get personalized recommendations for a user
   */
  async getUserRecommendations(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: { where: { status: 'ACTIVE' }, take: 1 },
      },
    });

    if (!user) {
      return null;
    }

    const currentUsage = await this.usageTracking.getCurrentUsage(userId);
    const stats = await this.usageTracking.getUsageStats(userId);
    const limits = stats.limits;

    const recommendations = {
      learningPath: [],
      features: [],
      upgrade: null as any,
    };

    // Learning path recommendations
    if (currentUsage.tests < 3) {
      recommendations.learningPath.push({
        title: 'Start Your Practice Journey',
        description: 'Take your first few practice tests to establish a baseline',
        action: 'Start a Test',
        priority: 'high',
      });
    }

    if (currentUsage.ai_tutor_messages === 0) {
      recommendations.learningPath.push({
        title: 'Meet Your AI Tutor',
        description: 'Get personalized help and explanations from our AI tutor',
        action: 'Try AI Tutor',
        priority: 'medium',
      });
    }

    // Feature recommendations
    const irtProfile = await this.prisma.iRTProfile.findFirst({
      where: { user_id: userId },
    });

    if (!irtProfile) {
      recommendations.features.push({
        title: 'Unlock Personalized Insights',
        description: 'Complete more tests to get IRT-based performance insights',
        action: 'View Insights',
        icon: 'chart',
      });
    }

    // Upgrade recommendations
    const upsellRec = await this.calculateUpsellRecommendation(user);
    if (upsellRec && upsellRec.confidence >= 70) {
      recommendations.upgrade = {
        tier: upsellRec.recommendedTier,
        confidence: upsellRec.confidence,
        reasons: upsellRec.reasons,
        benefits: this.getUpgradeBenefits(upsellRec.recommendedTier),
      };
    }

    return recommendations;
  }

  /**
   * Get benefits for upgrading to a tier
   */
  private getUpgradeBenefits(tier: string): string[] {
    const benefits = {
      GROW: [
        'Unlimited practice tests',
        'Unlimited AI tutor conversations',
        'Access to all exams',
        'Voice input and output',
        '100 question generations per month',
      ],
      SCALE: [
        'Everything in Grow',
        'Unlimited question generations',
        'API access for integrations',
        'Priority support',
        'Advanced analytics',
      ],
      ENTERPRISE: [
        'Everything in Scale',
        'SSO integration',
        'White-label options',
        'Dedicated support',
        'Custom integrations',
      ],
    };

    return benefits[tier] || [];
  }
}
