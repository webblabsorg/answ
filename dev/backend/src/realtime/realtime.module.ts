import { Module } from '@nestjs/common';
import { CollabGateway } from './collab.gateway';
import { JwtService } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { HomeworkModule } from '../homework/homework.module';

@Module({
  imports: [PrismaModule, HomeworkModule],
  providers: [CollabGateway, JwtService],
})
export class RealtimeModule {}
