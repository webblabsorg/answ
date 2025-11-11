import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AnalyticsService } from '../services/analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  /**
   * Get revenue metrics
   * GET /analytics/revenue
   */
  @Get('revenue')
  async getRevenueMetrics(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const metrics = await this.analyticsService.getRevenueMetrics(start, end);
    return { metrics };
  }

  /**
   * Get user growth metrics
   * GET /analytics/users
   */
  @Get('users')
  async getUserGrowthMetrics(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const metrics = await this.analyticsService.getUserGrowthMetrics(start, end);
    return { metrics };
  }

  /**
   * Get engagement metrics
   * GET /analytics/engagement
   */
  @Get('engagement')
  async getEngagementMetrics(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const metrics = await this.analyticsService.getEngagementMetrics(start, end);
    return { metrics };
  }

  /**
   * Get revenue trend over time
   * GET /analytics/trends/revenue?months=12
   */
  @Get('trends/revenue')
  async getRevenueTrend(@Query('months') months?: string) {
    const monthsNumber = months ? parseInt(months, 10) : 12;
    const trend = await this.analyticsService.getRevenueTrend(monthsNumber);
    return { trend };
  }

  /**
   * Get user growth trend over time
   * GET /analytics/trends/users?months=12
   */
  @Get('trends/users')
  async getUserGrowthTrend(@Query('months') months?: string) {
    const monthsNumber = months ? parseInt(months, 10) : 12;
    const trend = await this.analyticsService.getUserGrowthTrend(monthsNumber);
    return { trend };
  }

  /**
   * Get engagement trend over time
   * GET /analytics/trends/engagement?months=12
   */
  @Get('trends/engagement')
  async getEngagementTrend(@Query('months') months?: string) {
    const monthsNumber = months ? parseInt(months, 10) : 12;
    const trend = await this.analyticsService.getEngagementTrend(monthsNumber);
    return { trend };
  }

  /**
   * Get cohort analysis (retention)
   * GET /analytics/cohorts?months=6
   */
  @Get('cohorts')
  async getCohortAnalysis(@Query('months') months?: string) {
    const monthsNumber = months ? parseInt(months, 10) : 6;
    const cohorts = await this.analyticsService.getCohortAnalysis(monthsNumber);
    return { cohorts };
  }

  /**
   * Get top performing exams
   * GET /analytics/exams/top?limit=10
   */
  @Get('exams/top')
  async getTopExams(@Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    const exams = await this.analyticsService.getTopExams(limitNumber);
    return { exams };
  }

  /**
   * Export analytics data to CSV
   * GET /analytics/export?type=revenue&months=12
   */
  @Get('export')
  async exportAnalytics(
    @Res() res: Response,
    @Query('type') type: 'revenue' | 'users' | 'engagement',
    @Query('months') months?: string,
  ) {
    const monthsNumber = months ? parseInt(months, 10) : 12;
    const csv = await this.analyticsService.exportToCSV(type, monthsNumber);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=analytics-${type}-${new Date().toISOString()}.csv`);
    res.send(csv);
  }

  /**
   * Get dashboard overview (all key metrics)
   * GET /analytics/dashboard
   */
  @Get('dashboard')
  async getDashboardOverview() {
    const [revenue, users, engagement] = await Promise.all([
      this.analyticsService.getRevenueMetrics(),
      this.analyticsService.getUserGrowthMetrics(),
      this.analyticsService.getEngagementMetrics(),
    ]);

    return {
      revenue,
      users,
      engagement,
      timestamp: new Date().toISOString(),
    };
  }
}
