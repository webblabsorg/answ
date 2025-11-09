import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminCsvController } from './admin-csv.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    PrismaModule,
    AuditLogsModule,
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  controllers: [AdminController, AdminCsvController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
