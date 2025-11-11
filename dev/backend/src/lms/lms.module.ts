import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LMSController } from './lms.controller';
import { LMSService } from './lms.service';

@Module({
  imports: [PrismaModule],
  controllers: [LMSController],
  providers: [LMSService],
})
export class LMSModule {}
