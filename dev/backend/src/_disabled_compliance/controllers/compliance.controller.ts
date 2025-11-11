import { Controller, Get, Post, UseGuards, Param, Res, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ComplianceService } from '../services/compliance.service';
import { Response } from 'express';
import { join, normalize } from 'path';
import { existsSync } from 'fs';

@Controller('compliance')
@UseGuards(JwtAuthGuard)
export class ComplianceController {
  constructor(private complianceService: ComplianceService) {}

  /**
   * Request data export (GDPR Article 15)
   * POST /compliance/export-request
   */
  @Post('export-request')
  async requestDataExport(@CurrentUser() user: any) {
    const request = await this.complianceService.createDataExportRequest(user.id, 'export');
    return request;
  }

  /**
   * Request data deletion (GDPR Article 17)
   * POST /compliance/delete-request
   */
  @Post('delete-request')
  async requestDataDeletion(@CurrentUser() user: any) {
    const request = await this.complianceService.createDataExportRequest(user.id, 'delete');
    return request;
  }

  /**
   * Get my DSAR requests
   * GET /compliance/my-requests
   */
  @Get('my-requests')
  async getMyRequests(@CurrentUser() user: any) {
    const requests = await this.complianceService.getUserRequests(user.id);
    return { requests };
  }

  /**
   * Get pending DSAR requests (Admin only)
   * GET /compliance/pending-requests
   */
  @Get('pending-requests')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async getPendingRequests() {
    const requests = await this.complianceService.getPendingRequests();
    return { requests };
  }

  /**
   * Get data retention summary (Admin only)
   * GET /compliance/retention-summary
   */
  @Get('retention-summary')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async getRetentionSummary() {
    const summary = await this.complianceService.getRetentionSummary();
    return summary;
  }

  /**
   * Download exported data file (temporary)
   * GET /compliance/downloads/:filename
   */
  @Get('downloads/:filename')
  async download(@Param('filename') filename: string, @Res() res: Response) {
    const safe = filename.replace(/[^a-zA-Z0-9_\-.]/g, '');
    const filePath = normalize(join(process.cwd(), 'exports', safe));
    if (!existsSync(filePath)) throw new NotFoundException();
    res.download(filePath);
  }
}
