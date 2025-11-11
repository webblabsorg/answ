import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { QuestionGeneratorService, GenerateBatchDto } from '../services/question-generator.service';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Admin - Question Generation')
@ApiBearerAuth()
@Controller('admin/generation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
export class GenerationController {
  constructor(
    private generatorService: QuestionGeneratorService,
    private prisma: PrismaService,
  ) {}

  @Post('start')
  @ApiOperation({ summary: 'Start question generation job' })
  async startGeneration(
    @Body() dto: Omit<GenerateBatchDto, 'userId'>,
    @CurrentUser() user: any,
  ) {
    return this.generatorService.generateBatch({
      ...dto,
      userId: user.id,
    });
  }

  @Get('jobs')
  @ApiOperation({ summary: 'List generation jobs' })
  async listJobs(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: any,
  ) {
    return this.generatorService.listJobs(
      user?.role === UserRole.ADMIN ? undefined : user?.id,
      status,
      limit ? parseInt(limit) : 50,
    );
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get generation job details' })
  async getJob(@Param('id') id: string) {
    return this.generatorService.getJobStatus(id);
  }

  @Get('review-queue')
  @ApiOperation({ summary: 'Get questions pending review' })
  async getReviewQueue(
    @Query('status') status = 'PENDING',
    @Query('limit') limit = '50',
    @Query('minQuality') minQuality?: string,
  ) {
    return this.prisma.generatedQuestion.findMany({
      where: {
        status: status as any,
        ...(minQuality && { quality_score: { gte: parseFloat(minQuality) } }),
      },
      include: {
        generation_job: {
          include: {
            exam: { select: { name: true, code: true } },
          },
        },
        reviewed_by: { select: { name: true, email: true } },
      },
      orderBy: [
        { quality_score: 'desc' },
        { created_at: 'desc' },
      ],
      take: parseInt(limit),
    });
  }

  @Post('review-queue/:id/approve')
  @ApiOperation({ summary: 'Approve generated question and publish' })
  async approveQuestion(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const generatedQuestion = await this.prisma.generatedQuestion.findUnique({
      where: { id },
      include: { generation_job: true },
    });

    if (!generatedQuestion) {
      throw new Error('Generated question not found');
    }

    // Create actual question
    const question = await this.prisma.question.create({
      data: {
        exam_id: generatedQuestion.generation_job.exam_id,
        question_text: generatedQuestion.question_text,
        question_type: generatedQuestion.question_type,
        options: generatedQuestion.options,
        correct_answer: generatedQuestion.correct_answer,
        explanation: generatedQuestion.explanation,
        topic: generatedQuestion.topic,
        subtopic: generatedQuestion.subtopic,
        difficulty_level: generatedQuestion.difficulty_level,
        ai_generated: true,
        generated_question_id: generatedQuestion.id,
        quality_score: generatedQuestion.quality_score,
      },
    });

    // Update generated question status
    await this.prisma.generatedQuestion.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewed_by_id: user.id,
        approved_at: new Date(),
      },
    });

    return { success: true, question };
  }

  @Post('review-queue/:id/reject')
  @ApiOperation({ summary: 'Reject generated question' })
  async rejectQuestion(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @CurrentUser() user: any,
  ) {
    await this.prisma.generatedQuestion.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewed_by_id: user.id,
        review_notes: body.reason,
      },
    });

    return { success: true };
  }

  @Post('review-queue/:id/revise')
  @ApiOperation({ summary: 'Request revision for generated question' })
  async requestRevision(
    @Param('id') id: string,
    @Body() body: { notes: string },
    @CurrentUser() user: any,
  ) {
    await this.prisma.generatedQuestion.update({
      where: { id },
      data: {
        status: 'NEEDS_REVISION',
        reviewed_by_id: user.id,
        review_notes: body.notes,
      },
    });

    return { success: true };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get generation metrics' })
  async getMetrics() {
    const [total, pending, approved, rejected] = await Promise.all([
      this.prisma.generatedQuestion.count(),
      this.prisma.generatedQuestion.count({ where: { status: 'PENDING' } }),
      this.prisma.generatedQuestion.count({ where: { status: 'APPROVED' } }),
      this.prisma.generatedQuestion.count({ where: { status: 'REJECTED' } }),
    ]);

    const avgQuality = await this.prisma.generatedQuestion.aggregate({
      _avg: { quality_score: true, generation_cost: true },
    });

    const jobs = await this.prisma.generationJob.aggregate({
      _sum: { total_cost: true },
      _avg: { total_cost: true },
    });

    return {
      total,
      pendingCount: pending,
      approvedCount: approved,
      rejectedCount: rejected,
      approvalRate: total > 0 ? approved / total : 0,
      avgQualityScore: avgQuality._avg.quality_score || 0,
      avgCostPerQuestion: avgQuality._avg.generation_cost || 0,
      totalJobCost: jobs._sum.total_cost || 0,
      avgJobCost: jobs._avg.total_cost || 0,
    };
  }
}
