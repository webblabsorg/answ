import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QuestionGeneratorService } from '../services/question-generator.service';

@Processor('question-generation')
export class QuestionGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(QuestionGenerationProcessor.name);

  constructor(private generatorService: QuestionGeneratorService) {
    super();
  }

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing job ${job.id}: ${job.name}`);

    try {
      const result = await this.generatorService.processGeneration(job);
      this.logger.log(`Job ${job.id} completed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
