import { Controller, Get, Query, UseGuards, Res, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuditLogService } from '../services/audit-log.service';
import { Response } from 'express';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogController {
  constructor(private auditLogService: AuditLogService) {}

  /**
   * Get organization audit logs
   * GET /audit-logs/organization/:organizationId
   */
  @Get('organization/:organizationId')
  @Roles('ADMIN')
  async getOrganizationLogs(
    @Param('organizationId') organizationId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    
    const logs = await this.auditLogService.getOrganizationLogs(
      organizationId,
      limitNum,
      offsetNum,
    );

    return { logs };
  }

  /**
   * Get user audit logs
   * GET /audit-logs/me
   */
  @Get('me')
  async getMyLogs(@CurrentUser() user: any, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const logs = await this.auditLogService.getUserLogs(user.id, limitNum);
    
    return { logs };
  }

  /**
   * Export audit logs as CSV
   * GET /audit-logs/organization/:organizationId/export
   */
  @Get('organization/:organizationId/export')
  @Roles('ADMIN')
  async exportLogs(
    @Param('organizationId') organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: Response,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const csv = await this.auditLogService.exportLogsCSV(organizationId, start, end);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=audit-logs-${organizationId}-${Date.now()}.csv`,
    );
    res.send(csv);
  }

  /**
   * Verify audit log integrity
   * GET /audit-logs/verify
   */
  @Get('verify')
  @Roles('ADMIN')
  async verifyIntegrity(
    @Query('startId') startId?: string,
    @Query('endId') endId?: string,
  ) {
    const result = await this.auditLogService.verifyIntegrity(startId, endId);
    return result;
  }

  /**
   * Get audit statistics
   * GET /audit-logs/organization/:organizationId/stats
   */
  @Get('organization/:organizationId/stats')
  @Roles('ADMIN')
  async getStatistics(
    @Param('organizationId') organizationId: string,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;
    const stats = await this.auditLogService.getStatistics(organizationId, daysNum);
    
    return stats;
  }
}
