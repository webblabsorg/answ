import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { CohereProvider } from './providers/cohere.provider';
import { AIOrchestrator } from './services/ai-orchestrator.service';
import { AIUsageTrackingService } from './services/ai-usage-tracking.service';
import { PromptTemplateService } from './services/prompt-template.service';
import { VectorStoreService } from './services/vector-store.service';
import { QuestionGeneratorService } from './services/question-generator.service';
import { ContentValidatorService } from './services/content-validator.service';
import { RAGService } from './services/rag.service';
import { AITutorService } from './services/ai-tutor.service';
import { ResponseCacheService } from './services/response-cache.service';
import { TranslationService } from './services/translation.service';
import { IRTService } from './services/irt.service';
import { PersonalizationService } from './services/personalization.service';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { AIAdminController } from './controllers/ai-admin.controller';
import { GenerationController } from './controllers/generation.controller';
import { TutorController } from './controllers/tutor.controller';
import { IRTController } from './controllers/irt.controller';
import { QuestionGenerationProcessor } from './processors/question-generation.processor';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    BullModule.registerQueue({
      name: 'question-generation',
    }),
  ],
  controllers: [AIAdminController, GenerationController, TutorController, IRTController],
  providers: [
    // Providers
    OpenAIProvider,
    AnthropicProvider,
    CohereProvider,
    // Core Services
    AIOrchestrator,
    AIUsageTrackingService,
    PromptTemplateService,
    VectorStoreService,
    // Session 8 Services
    QuestionGeneratorService,
    ContentValidatorService,
    // Session 9 Services
    RAGService,
    AITutorService,
    ResponseCacheService,
    TranslationService,
    // Session 10 Services
    IRTService,
    PersonalizationService,
    // Guards
    RateLimitGuard,
    // Queue Processors
    QuestionGenerationProcessor,
  ],
  exports: [
    AIOrchestrator,
    AIUsageTrackingService,
    PromptTemplateService,
    VectorStoreService,
    QuestionGeneratorService,
    ContentValidatorService,
    RAGService,
    AITutorService,
    ResponseCacheService,
    TranslationService,
    IRTService,
    PersonalizationService,
  ],
})
export class AIModule {}
