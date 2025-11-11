import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { PredictionService } from '../services/prediction.service';

@Controller('predictions')
@UseGuards(JwtAuthGuard)
export class PredictionsController {
  constructor(private predictionService: PredictionService) {}

  /**
   * Get churn predictions (admin only)
   * GET /predictions/churn?limit=50
   */
  @Get('churn')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async getChurnPredictions(@Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit, 10) : 50;
    const predictions = await this.predictionService.predictChurn(limitNumber);
    return { predictions };
  }

  /**
   * Get usage forecasts (admin only)
   * GET /predictions/usage-forecast?limit=50
   */
  @Get('usage-forecast')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async getUsageForecasts(@Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit, 10) : 50;
    const forecasts = await this.predictionService.forecastUsage(limitNumber);
    return { forecasts };
  }

  /**
   * Get upsell recommendations (admin only)
   * GET /predictions/upsell?limit=50
   */
  @Get('upsell')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async getUpsellRecommendations(@Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit, 10) : 50;
    const recommendations = await this.predictionService.generateUpsellRecommendations(limitNumber);
    return { recommendations };
  }

  /**
   * Get comprehensive prediction insights (admin only)
   * GET /predictions/insights
   */
  @Get('insights')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async getPredictionInsights() {
    const insights = await this.predictionService.getPredictionInsights();
    return insights;
  }

  /**
   * Get personalized recommendations for current user
   * GET /predictions/recommendations
   */
  @Get('recommendations')
  async getUserRecommendations(@CurrentUser() user: any) {
    const recommendations = await this.predictionService.getUserRecommendations(user.id);
    return recommendations;
  }
}
