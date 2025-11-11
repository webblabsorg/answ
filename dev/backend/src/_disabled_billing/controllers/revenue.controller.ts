import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AnalyticsService } from '../services/analytics.service';
import { TaxService } from '../services/tax.service';
import { Response } from 'express';

@Controller('revenue')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class RevenueController {
  constructor(
    private analyticsService: AnalyticsService,
    private taxService: TaxService,
  ) {}

  /**
   * Get revenue dashboard
   * GET /revenue/dashboard
   */
  @Get('dashboard')
  async getDashboard(@Query('months') months?: string) {
    const monthsNumber = months ? parseInt(months, 10) : 12;
    
    const [revenue, users, engagement, trends] = await Promise.all([
      this.analyticsService.getRevenueMetrics(),
      this.analyticsService.getUserGrowthMetrics(),
      this.analyticsService.getEngagementMetrics(),
      this.analyticsService.getRevenueTrend(monthsNumber),
    ]);

    return {
      revenue,
      users,
      engagement,
      trends,
    };
  }

  /**
   * Export revenue data as CSV
   * GET /revenue/export/csv
   */
  @Get('export/csv')
  async exportCSV(
    @Query('months') months?: string,
    @Res() res?: Response,
  ) {
    const monthsNumber = months ? parseInt(months, 10) : 12;
    const csvData = await this.analyticsService.exportToCSV('revenue', monthsNumber);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=revenue-export-${Date.now()}.csv`);
    res.send(csvData);
  }

  /**
   * Get tax summary
   * GET /revenue/tax-summary
   */
  @Get('tax-summary')
  async getTaxSummary(
    @Query('year') year?: string,
    @Query('quarter') quarter?: string,
  ) {
    const yearNumber = year ? parseInt(year, 10) : new Date().getFullYear();
    const quarterNumber = quarter ? parseInt(quarter, 10) : undefined;
    
    // For demo, using a placeholder organization ID
    // In production, this would be per-organization or global
    const summary = await this.taxService.generateTaxSummary(
      'global',
      yearNumber,
      quarterNumber,
    );

    return summary;
  }

  /**
   * Get MRR breakdown
   * GET /revenue/mrr-breakdown
   */
  @Get('mrr-breakdown')
  async getMRRBreakdown() {
    const metrics = await this.analyticsService.getRevenueMetrics();
    
    // Breakdown by tier
    const breakdown = {
      total_mrr: metrics.mrr,
      by_tier: {
        grow: metrics.mrr * 0.4, // 40% from Grow
        scale: metrics.mrr * 0.35, // 35% from Scale
        enterprise: metrics.mrr * 0.25, // 25% from Enterprise
      },
      growth_rate: metrics.mrr_growth_rate,
    };

    return breakdown;
  }

  /**
   * Get churn analysis
   * GET /revenue/churn-analysis
   */
  @Get('churn-analysis')
  async getChurnAnalysis() {
    const metrics = await this.analyticsService.getRevenueMetrics();
    
    return {
      churn_rate: metrics.churn_rate,
      churned_mrr: metrics.mrr * (metrics.churn_rate / 100),
      retention_rate: 100 - metrics.churn_rate,
      cohort_data: [], // Would come from cohort analysis
    };
  }

  /**
   * Get LTV and CAC metrics
   * GET /revenue/ltv-cac
   */
  @Get('ltv-cac')
  async getLTVCAC() {
    const metrics = await this.analyticsService.getRevenueMetrics();
    
    return {
      ltv: metrics.ltv,
      cac: 50, // Placeholder - would calculate from marketing spend
      ltv_cac_ratio: metrics.ltv / 50,
      payback_period: 3, // Months - placeholder
    };
  }
}
