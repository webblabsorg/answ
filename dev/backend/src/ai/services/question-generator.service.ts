import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { AIOrchestrator } from './ai-orchestrator.service';
import { PromptTemplateService } from './prompt-template.service';
import { ContentValidatorService } from './content-validator.service';

export interface GenerateBatchDto {
  examId: string;
  topic: string;
  subtopic?: string;
  difficulty: number;
  count: number;
  userId: string;
}

@Injectable()
export class QuestionGeneratorService {
  private readonly logger = new Logger(QuestionGeneratorService.name);

  constructor(
    private prisma: PrismaService,
    private aiOrchestrator: AIOrchestrator,
    private promptTemplate: PromptTemplateService,
    private validator: ContentValidatorService,
    @InjectQueue('question-generation') private generationQueue?: Queue,
  ) {}

  async generateBatch(dto: GenerateBatchDto) {
    this.logger.log(`Starting batch generation: ${dto.count} questions for ${dto.examId}/${dto.topic}`);

    // Create job in database
    const job = await this.prisma.generationJob.create({
      data: {
        exam_id: dto.examId,
        topic: dto.topic,
        subtopic: dto.subtopic,
        difficulty: dto.difficulty,
        count: dto.count,
        status: 'PENDING',
        created_by_id: dto.userId,
      },
    });

    // Queue for async processing if queue available, otherwise process immediately
    if (this.generationQueue) {
      await this.generationQueue.add('generate-questions', {
        jobId: job.id,
        ...dto,
      });
      this.logger.log(`Generation job ${job.id} queued`);
    } else {
      // Fallback: process immediately (for development/testing)
      setImmediate(() => {
        this.processGeneration({
          jobId: job.id,
          ...dto,
        }).catch(err => {
          this.logger.error(`Generation failed: ${err.message}`);
        });
      });
      this.logger.log(`Generation job ${job.id} started immediately`);
    }

    return job;
  }

  async processGeneration(jobData: Job | any) {
    const data = jobData.data || jobData;
    const { jobId, examId, topic, subtopic, difficulty, count } = data;
    
    this.logger.log(`Processing generation job ${jobId}`);

    try {
      // Update status
      await this.prisma.generationJob.update({
        where: { id: jobId },
        data: { status: 'IN_PROGRESS', started_at: new Date() },
      });

      // Get exam details
      const exam = await this.prisma.exam.findUnique({
        where: { id: examId },
      });

      if (!exam) {
        throw new Error(`Exam ${examId} not found`);
      }

      // Determine template based on exam code
      const templateName = this.getTemplateName(exam.code, topic);
      
      // Get few-shot examples
      const examples = await this.promptTemplate.getFewShotExamples(
        exam.code,
        topic,
        Math.min(5, count),
      );

      const generated = [];
      const failed = [];
      let totalCost = 0;

      // Generate in batches of 10
      for (let i = 0; i < count; i += 10) {
        const batchSize = Math.min(10, count - i);
        
        this.logger.log(`Generating batch ${i / 10 + 1}, size: ${batchSize}`);

        const batchPromises = Array.from({ length: batchSize }, async () => {
          try {
            // Render prompt
            const prompt = await this.promptTemplate.render(templateName, {
              difficulty,
              topic,
              subtopic: subtopic || '',
              blank_count: 1,
              examples: JSON.stringify(examples.slice(0, 3)),
            });

            // Call AI
            const response = await this.aiOrchestrator.generate({
              type: 'question_generation',
              prompt,
              temperature: 0.8,
              responseFormat: { type: 'json_object' },
              priority: 'quality',
              maxTokens: 1000,
            });

            totalCost += response.cost;

            // Parse response
            const question = JSON.parse(response.content);

            // Validate
            const validation = await this.validator.validate({
              ...question,
              exam_id: examId,
            });

            if (validation.isValid && validation.score > 0.7) {
              generated.push({
                ...question,
                quality_score: validation.score,
                validation_errors: validation.errors,
                validation_warnings: validation.warnings,
                ai_provider: response.provider,
                ai_model: response.model,
                generation_cost: response.cost,
              });
            } else {
              failed.push({
                question,
                errors: validation.errors,
                warnings: validation.warnings,
                score: validation.score,
              });
            }
          } catch (error) {
            this.logger.error(`Generation error: ${error.message}`);
            failed.push({ error: error.message });
          }
        });

        await Promise.all(batchPromises);

        // Update progress
        const progress = (i + batchSize) / count;
        await this.prisma.generationJob.update({
          where: { id: jobId },
          data: {
            progress,
            generated_count: generated.length,
            failed_count: failed.length,
            total_cost: totalCost,
          },
        });

        this.logger.log(`Progress: ${(progress * 100).toFixed(1)}%, Generated: ${generated.length}, Failed: ${failed.length}`);
      }

      // Save to review queue
      await this.saveToReviewQueue(generated, jobId);

      // Mark complete
      await this.prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completed_at: new Date(),
          generated_count: generated.length,
          failed_count: failed.length,
          total_cost: totalCost,
        },
      });

      this.logger.log(`Job ${jobId} complete. Generated: ${generated.length}, Failed: ${failed.length}, Cost: $${totalCost.toFixed(4)}`);

      return {
        success: true,
        generated: generated.length,
        failed: failed.length,
        cost: totalCost,
      };
    } catch (error) {
      this.logger.error(`Job ${jobId} failed: ${error.message}`);
      
      await this.prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          error_message: error.message,
          completed_at: new Date(),
        },
      });

      throw error;
    }
  }

  private async saveToReviewQueue(questions: any[], jobId: string) {
    if (questions.length === 0) return;

    await this.prisma.generatedQuestion.createMany({
      data: questions.map(q => ({
        generation_job_id: jobId,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options || null,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        topic: q.topic,
        subtopic: q.subtopic,
        difficulty_level: q.difficulty_level,
        quality_score: q.quality_score,
        validation_errors: q.validation_errors || [],
        validation_warnings: q.validation_warnings || [],
        ai_provider: q.ai_provider,
        ai_model: q.ai_model,
        generation_cost: q.generation_cost,
        status: 'PENDING',
      })),
    });

    this.logger.log(`Saved ${questions.length} questions to review queue`);
  }

  private getTemplateName(examCode: string, topic: string): string {
    // Map exam code and topic to template
    if (examCode === 'GRE' && topic.toLowerCase().includes('verbal')) {
      return 'gre_text_completion';
    }
    if (examCode === 'SAT' && topic.toLowerCase().includes('math')) {
      return 'sat_math';
    }
    if (examCode === 'GMAT' && topic.toLowerCase().includes('data')) {
      return 'gmat_data_sufficiency';
    }
    
    // Default to GRE text completion
    return 'gre_text_completion';
  }

  async getJobStatus(jobId: string) {
    return this.prisma.generationJob.findUnique({
      where: { id: jobId },
      include: {
        exam: { select: { name: true, code: true } },
        created_by: { select: { id: true, name: true, email: true } },
        generated_questions: {
          where: { status: 'PENDING' },
          take: 10,
          orderBy: { quality_score: 'desc' },
        },
      },
    });
  }

  async listJobs(userId?: string, status?: string, limit = 50) {
    return this.prisma.generationJob.findMany({
      where: {
        ...(userId && { created_by_id: userId }),
        ...(status && { status: status as any }),
      },
      include: {
        exam: { select: { name: true, code: true } },
        created_by: { select: { name: true, email: true } },
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }
}
