import { Controller, Get, Post, Query, UseGuards, Delete } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UsageTrackingService } from '../services/usage-tracking.service';

@Controller('usage')
@UseGuards(JwtAuthGuard)
export class UsageController {
  constructor(private usageTracking: UsageTrackingService) {}

  /**
   * Get current month's usage for authenticated user
   * GET /usage/current
   */
  @Get('current')
  async getCurrentUsage(@CurrentUser() user: any) {
    const usage = await this.usageTracking.getCurrentUsage(user.id);
    return { usage };
  }

  /**
   * Get usage statistics with limits and warnings
   * GET /usage/stats
   */
  @Get('stats')
  async getUsageStats(@CurrentUser() user: any) {
    const stats = await this.usageTracking.getUsageStats(user.id);
    return stats;
  }

  /**
   * Get usage history for last N months
   * GET /usage/history?months=3
   */
  @Get('history')
  async getUsageHistory(@CurrentUser() user: any, @Query('months') months?: string) {
    const monthsNumber = months ? parseInt(months, 10) : 3;
    const history = await this.usageTracking.getUsageHistory(user.id, monthsNumber);
    return { history };
  }

  /**
   * Reset current month's usage (admin only, for testing)
   * DELETE /usage/reset/:userId
   */
  @Delete('reset/:userId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async resetUsage(@CurrentUser() user: any, @Query('userId') userId: string) {
    await this.usageTracking.resetUsage(userId || user.id);
    return { message: 'Usage reset successfully' };
  }

  /**
   * Get aggregated usage stats (admin only)
   * GET /usage/admin/stats
   */
  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async getAggregatedStats(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const stats = await this.usageTracking.getAggregatedStats(start, end);
    return stats;
  }
}
