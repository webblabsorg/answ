import { Module } from '@nestjs/common';
import { TestSessionsService } from './test-sessions.service';
import { TestSessionsController } from './test-sessions.controller';
import { TestSessionsGateway } from './test-sessions.gateway';
import { QuestionsModule } from '../questions/questions.module';
import { GradingModule } from '../grading/grading.module';
import { QuotaGuard } from './local-quota.guard';

@Module({
  imports: [QuestionsModule, GradingModule],
  controllers: [TestSessionsController],
  providers: [TestSessionsService, TestSessionsGateway, QuotaGuard],
  exports: [TestSessionsService, TestSessionsGateway],
})
export class TestSessionsModule {}
