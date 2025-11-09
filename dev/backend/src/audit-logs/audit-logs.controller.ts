import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AuditLogsService } from './audit-logs.service';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'take', required: false })
  findAll(
    @Query('userId') userId?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.auditLogsService.findAll({
      userId,
      entityType,
      action,
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
    });
  }

  @Get('entity')
  @ApiQuery({ name: 'entityType', required: true })
  @ApiQuery({ name: 'entityId', required: true })
  findByEntity(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.auditLogsService.findByEntity(entityType, entityId);
  }

  @Get('user')
  @ApiQuery({ name: 'userId', required: true })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'take', required: false })
  findByUser(
    @Query('userId') userId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.auditLogsService.findByUser(
      userId,
      skip ? parseInt(skip) : undefined,
      take ? parseInt(take) : undefined,
    );
  }
}
