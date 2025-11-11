import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogService } from './services/audit-log.service';
import { APIKeyService } from './services/api-key.service';
import { PermissionService } from './services/permission.service';
import { ComplianceService } from './services/compliance.service';
import { IntegrityService } from './services/integrity.service';
import { AuditLogController } from './controllers/audit-log.controller';
import { APIKeyController } from './controllers/api-key.controller';
import { ComplianceController } from './controllers/compliance.controller';
import { APIKeyGuard } from './guards/api-key.guard';
import { PermissionGuard } from './guards/permission.guard';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [
    AuditLogController,
    APIKeyController,
    ComplianceController,
  ],
  providers: [
    AuditLogService,
    APIKeyService,
    PermissionService,
    ComplianceService,
    IntegrityService,
    APIKeyGuard,
    PermissionGuard,
  ],
  exports: [
    AuditLogService,
    APIKeyService,
    PermissionService,
    ComplianceService,
    IntegrityService,
    APIKeyGuard,
    PermissionGuard,
  ],
})
export class ComplianceModule {}
