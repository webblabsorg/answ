import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { EssaysService } from './essays.service';
import { EssaysController } from './essays.controller';

@Module({
  imports: [PrismaModule, HttpModule],
  providers: [EssaysService],
  controllers: [EssaysController],
})
export class EssaysModule {}
