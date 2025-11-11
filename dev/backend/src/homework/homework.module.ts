import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HomeworkController } from './homework.controller';
import { HomeworkService } from './homework.service';
import { GroupService } from './group.service';
import { PeerReviewService } from './peer-review.service';
import { AnalyticsService } from './analytics.service';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [PrismaModule],
  controllers: [HomeworkController],
  providers: [
    HomeworkService,
    GroupService,
    PeerReviewService,
    AnalyticsService,
    RolesGuard,
  ],
  exports: [
    HomeworkService,
    GroupService,
    PeerReviewService,
    AnalyticsService,
  ],
})
export class HomeworkModule {}
