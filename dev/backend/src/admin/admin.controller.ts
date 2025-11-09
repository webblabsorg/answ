import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { BulkImportDto } from './dto/bulk-import.dto';
import { GradeEssayDto } from './dto/grade-essay.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ============================================================================
  // User Management
  // ============================================================================

  @Get('users')
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'take', required: false })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'search', required: false })
  getAllUsers(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllUsers({
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
      role,
      search,
    });
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Update user role' })
  updateUserRole(
    @Param('id') userId: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() user: any,
  ) {
    return this.adminService.updateUserRole(userId, dto, user.id);
  }

  @Patch('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend a user' })
  suspendUser(@Param('id') userId: string, @CurrentUser() user: any) {
    return this.adminService.suspendUser(userId, user.id);
  }

  @Patch('users/:id/activate')
  @ApiOperation({ summary: 'Activate a user' })
  activateUser(@Param('id') userId: string, @CurrentUser() user: any) {
    return this.adminService.activateUser(userId, user.id);
  }

  // ============================================================================
  // Bulk Import
  // ============================================================================

  @Post('questions/bulk-import')
  @ApiOperation({ summary: 'Bulk import questions' })
  bulkImportQuestions(@Body() dto: BulkImportDto, @CurrentUser() user: any) {
    return this.adminService.bulkImportQuestions(dto, user.id);
  }

  // ============================================================================
  // Essay Review
  // ============================================================================

  @Get('essays/unreviewed')
  @ApiOperation({ summary: 'Get unreviewed essays' })
  @ApiQuery({ name: 'skip', required: false })
  @ApiQuery({ name: 'take', required: false })
  getUnreviewedEssays(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.adminService.getUnreviewedEssays({
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
    });
  }

  @Post('essays/:id/grade')
  @ApiOperation({ summary: 'Grade an essay' })
  gradeEssay(
    @Param('id') attemptId: string,
    @Body() dto: GradeEssayDto,
    @CurrentUser() user: any,
  ) {
    return this.adminService.gradeEssay(attemptId, dto, user.id);
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  @Get('stats')
  @ApiOperation({ summary: 'Get admin statistics' })
  getAdminStats() {
    return this.adminService.getAdminStats();
  }
}
