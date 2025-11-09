import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AIOrchestrator } from '../services/ai-orchestrator.service';
import { AIUsageTrackingService } from '../services/ai-usage-tracking.service';
import { VectorStoreService } from '../services/vector-store.service';
import { PromptTemplateService } from '../services/prompt-template.service';

@ApiTags('Admin - AI')
@ApiBearerAuth()
@Controller('admin/ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AIAdminController {
  constructor(
    private aiOrchestrator: AIOrchestrator,
    private usageTracking: AIUsageTrackingService,
    private vectorStore: VectorStoreService,
    private promptTemplate: PromptTemplateService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Check AI provider health status' })
  async checkHealth() {
    return this.aiOrchestrator.getProviderHealth();
  }

  @Post('test-generate')
  @ApiOperation({ summary: 'Test AI generation (for debugging)' })
  async testGenerate(@Body() body: { prompt: string; priority?: string }) {
    const response = await this.aiOrchestrator.generate({
      type: 'question_generation',
      prompt: body.prompt,
      temperature: 0.7,
      priority: (body.priority as any) || 'quality',
    });

    return {
      success: true,
      response: {
        content: response.content,
        provider: response.provider,
        model: response.model,
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        latencyMs: response.latencyMs,
      },
    };
  }

  @Get('stats/daily')
  @ApiOperation({ summary: 'Get daily AI usage statistics' })
  async getDailyStats(@Query('date') date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    return this.usageTracking.getDailyStats(targetDate);
  }

  @Get('stats/monthly')
  @ApiOperation({ summary: 'Get monthly AI usage statistics' })
  async getMonthlyStats(
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.usageTracking.getMonthlyStats(
      parseInt(year),
      parseInt(month),
    );
  }

  @Get('stats/costs')
  @ApiOperation({ summary: 'Get AI cost trends by date range' })
  async getCostTrends(
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.usageTracking.getCostByDateRange(
      new Date(start),
      new Date(end),
    );
  }

  @Post('vector/search')
  @ApiOperation({ summary: 'Search vector store (for testing)' })
  async vectorSearch(
    @Body()
    body: {
      query: string;
      topK?: number;
      filter?: Record<string, any>;
    },
  ) {
    return this.vectorStore.search(body.query, {
      topK: body.topK || 10,
      filter: body.filter,
    });
  }

  @Get('templates')
  @ApiOperation({ summary: 'List all prompt templates' })
  async listTemplates() {
    // This would need a method in PromptTemplateService
    return {
      message: 'Template listing not yet implemented',
      availableTemplates: [
        'gre_text_completion',
        'sat_math',
        'gmat_data_sufficiency',
        'explanation_generation',
        'ai_tutor_system',
      ],
    };
  }
}
