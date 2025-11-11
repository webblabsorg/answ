import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { QuotaGuard, RequireQuota } from '../../billing/guards/quota.guard';
import { AITutorService, TutorRequest } from '../services/ai-tutor.service';
import { ResponseCacheService } from '../services/response-cache.service';

@Controller('tutor')
@UseGuards(JwtAuthGuard, RateLimitGuard)
export class TutorController {
  constructor(
    private tutorService: AITutorService,
    private cacheService: ResponseCacheService,
  ) {}

  /**
   * Main chat endpoint
   * POST /api/tutor/chat
   */
  @Post('chat')
  @UseGuards(QuotaGuard)
  @RequireQuota('ai_tutor', 1)
  async chat(@Request() req, @Body() body: Omit<TutorRequest, 'userId'>) {
    return this.tutorService.chat({
      userId: req.user.id,
      ...body,
    });
  }

  /**
   * Explain a specific question
   * POST /api/tutor/explain/:questionId
   */
  @Post('explain/:questionId')
  @UseGuards(QuotaGuard)
  @RequireQuota('ai_tutor', 1)
  async explainQuestion(
    @Request() req,
    @Param('questionId') questionId: string,
    @Body() body: { userAnswer?: any },
  ) {
    return this.tutorService.explainQuestion(
      req.user.id,
      questionId,
      body.userAnswer,
    );
  }

  /**
   * Get study tips for a topic
   * POST /api/tutor/study-tips
   */
  @Post('study-tips')
  @UseGuards(QuotaGuard)
  @RequireQuota('ai_tutor', 1)
  async getStudyTips(
    @Request() req,
    @Body() body: { examId: string; topic: string },
  ) {
    return this.tutorService.getStudyTips(
      req.user.id,
      body.examId,
      body.topic,
    );
  }

  /**
   * Get user's conversations
   * GET /api/tutor/conversations
   */
  @Get('conversations')
  async getConversations(
    @Request() req,
    @Query('examId') examId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tutorService.getConversations(
      req.user.id,
      examId,
      limit ? parseInt(limit) : 20,
    );
  }

  /**
   * Get specific conversation
   * GET /api/tutor/conversations/:id
   */
  @Get('conversations/:id')
  async getConversation(
    @Request() req,
    @Param('id') conversationId: string,
  ) {
    return this.tutorService.getConversation(conversationId, req.user.id);
  }

  /**
   * Archive a conversation
   * POST /api/tutor/conversations/:id/archive
   */
  @Post('conversations/:id/archive')
  async archiveConversation(
    @Request() req,
    @Param('id') conversationId: string,
  ) {
    return this.tutorService.archiveConversation(conversationId, req.user.id);
  }

  /**
   * Get cache statistics
   * GET /api/tutor/cache/stats
   */
  @Get('cache/stats')
  async getCacheStats() {
    return this.cacheService.getStats();
  }

  /**
   * Clear cache
   * POST /api/tutor/cache/clear
   */
  @Post('cache/clear')
  async clearCache() {
    await this.cacheService.clear();
    return { success: true, message: 'Cache cleared' };
  }
}
