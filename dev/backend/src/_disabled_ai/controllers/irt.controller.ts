import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { IRTService } from '../services/irt.service';
import { PersonalizationService } from '../services/personalization.service';

@Controller('irt')
@UseGuards(JwtAuthGuard, RateLimitGuard)
export class IRTController {
  constructor(
    private irtService: IRTService,
    private personalizationService: PersonalizationService,
  ) {}

  /**
   * Get user's ability estimate for an exam
   * GET /api/irt/ability/:examId
   */
  @Get('ability/:examId')
  async getUserAbility(@Request() req, @Param('examId') examId: string) {
    const userId = req.user.id;
    const result = await this.irtService.estimateAbility(userId, examId);
    
    return {
      userId,
      examId,
      abilityEstimate: result.theta,
      standardError: result.standardError,
      attemptsCount: result.attemptsCount,
      confidenceLevel: this.getConfidenceLevel(result.standardError),
    };
  }

  /**
   * Update user's IRT profile
   * POST /api/irt/ability/:examId/update
   */
  @Post('ability/:examId/update')
  async updateUserAbility(@Request() req, @Param('examId') examId: string) {
    const userId = req.user.id;
    await this.irtService.updateUserProfile(userId, examId);
    
    return {
      success: true,
      message: 'Ability profile updated successfully',
    };
  }

  /**
   * Get ability progression over time
   * GET /api/irt/ability/:examId/progression
   */
  @Get('ability/:examId/progression')
  async getAbilityProgression(
    @Request() req,
    @Param('examId') examId: string,
  ) {
    const userId = req.user.id;
    const progression = await this.irtService.getAbilityProgression(
      userId,
      examId,
    );
    
    return {
      userId,
      examId,
      progression,
    };
  }

  /**
   * Get next adaptive question
   * GET /api/irt/next-question/:examId
   */
  @Get('next-question/:examId')
  async getNextAdaptiveQuestion(
    @Request() req,
    @Param('examId') examId: string,
    @Query('exclude') excludeIds?: string,
  ) {
    const userId = req.user.id;
    const excludeQuestionIds = excludeIds ? excludeIds.split(',') : [];
    
    const questionId = await this.irtService.getNextAdaptiveQuestion(
      userId,
      examId,
      excludeQuestionIds,
    );
    
    if (!questionId) {
      return {
        success: false,
        message: 'No suitable adaptive question found',
        questionId: null,
      };
    }
    
    return {
      success: true,
      questionId,
      reason: 'Selected based on maximum information at your ability level',
    };
  }

  /**
   * Get question IRT statistics
   * GET /api/irt/questions/:questionId/stats
   */
  @Get('questions/:questionId/stats')
  async getQuestionStats(@Param('questionId') questionId: string) {
    const stats = await this.irtService.getQuestionStatistics(questionId);
    
    return {
      questionId,
      irtParameters: {
        a: stats.a,
        b: stats.b,
        c: stats.c,
      },
      calibrationInfo: {
        sampleSize: stats.calibrationSample,
        lastCalibrated: stats.lastCalibrated,
      },
      attemptStats: {
        totalAttempts: stats.totalAttempts,
        correctRate: stats.correctRate,
      },
      isCalibrated: stats.a !== null && stats.b !== null && stats.c !== null,
    };
  }

  /**
   * Calibrate a single question
   * POST /api/irt/questions/:questionId/calibrate
   */
  @Post('questions/:questionId/calibrate')
  async calibrateQuestion(@Param('questionId') questionId: string) {
    const result = await this.irtService.calibrateQuestion(questionId);
    
    if (!result) {
      return {
        success: false,
        message: 'Insufficient data for calibration (need 30+ attempts)',
      };
    }
    
    return {
      success: true,
      questionId,
      parameters: {
        a: result.a,
        b: result.b,
        c: result.c,
      },
      sampleSize: result.sampleSize,
    };
  }

  /**
   * Batch calibrate questions for an exam
   * POST /api/irt/calibrate/batch
   */
  @Post('calibrate/batch')
  async calibrateBatch(
    @Body() body: { examId: string; minAttempts?: number },
  ) {
    const { examId, minAttempts = 30 } = body;
    const result = await this.irtService.calibrateBatch(examId, minAttempts);
    
    return {
      success: true,
      examId,
      results: {
        calibrated: result.calibrated,
        skipped: result.skipped,
        failed: result.failed,
      },
    };
  }

  /**
   * Get personalized study plan
   * GET /api/irt/study-plan/:examId
   */
  @Get('study-plan/:examId')
  async getStudyPlan(
    @Request() req,
    @Param('examId') examId: string,
    @Query('targetScore') targetScore?: string,
  ) {
    const userId = req.user.id;
    const target = targetScore ? parseFloat(targetScore) : undefined;
    
    const studyPlan = await this.personalizationService.generateStudyPlan(
      userId,
      examId,
      target,
    );
    
    return studyPlan;
  }

  /**
   * Get personalized question recommendations
   * GET /api/irt/recommendations/:examId
   */
  @Get('recommendations/:examId')
  async getRecommendations(
    @Request() req,
    @Param('examId') examId: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.id;
    const maxResults = limit ? parseInt(limit) : 10;
    
    const recommendations = await this.personalizationService.getRecommendations(
      userId,
      examId,
      maxResults,
    );
    
    return {
      userId,
      examId,
      recommendations,
      count: recommendations.length,
    };
  }

  /**
   * Get performance insights
   * GET /api/irt/insights/:examId
   */
  @Get('insights/:examId')
  async getPerformanceInsights(
    @Request() req,
    @Param('examId') examId: string,
  ) {
    const userId = req.user.id;
    const insights = await this.personalizationService.getPerformanceInsights(
      userId,
      examId,
    );
    
    return {
      userId,
      examId,
      insights,
    };
  }

  /**
   * Get optimal study time recommendations
   * GET /api/irt/study-time/:examId
   */
  @Get('study-time/:examId')
  async getOptimalStudyTime(
    @Request() req,
    @Param('examId') examId: string,
  ) {
    const userId = req.user.id;
    const recommendations = await this.personalizationService.getOptimalStudyTime(
      userId,
      examId,
    );
    
    return {
      userId,
      examId,
      recommendations,
    };
  }

  /**
   * Get weak topics
   * GET /api/irt/weak-topics/:examId
   */
  @Get('weak-topics/:examId')
  async getWeakTopics(@Request() req, @Param('examId') examId: string) {
    const userId = req.user.id;
    const weakTopics = await this.personalizationService.identifyWeakTopics(
      userId,
      examId,
    );
    
    return {
      userId,
      examId,
      weakTopics,
      count: weakTopics.length,
    };
  }

  private getConfidenceLevel(standardError: number): string {
    if (standardError < 0.3) return 'High';
    if (standardError < 0.5) return 'Medium';
    return 'Low';
  }
}
