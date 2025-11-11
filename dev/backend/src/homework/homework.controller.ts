import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { HomeworkService } from './homework.service';
import { GroupService } from './group.service';
import { PeerReviewService } from './peer-review.service';
import { AnalyticsService } from './analytics.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { CreateSubmissionDto, UpdateSubmissionDto, GradeSubmissionDto } from './dto/create-submission.dto';
import { CreateGroupDto, AddGroupMemberDto } from './dto/group.dto';
import { CreatePeerReviewDto, AssignPeerReviewsDto } from './dto/peer-review.dto';

@Controller('homework')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HomeworkController {
  constructor(
    private readonly homeworkService: HomeworkService,
    private readonly groupService: GroupService,
    private readonly peerReviewService: PeerReviewService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  // ============================================================================
  // Student Endpoints
  // ============================================================================

  @Get('dashboard')
  @Roles('TEST_TAKER')
  async getStudentDashboard(@Request() req) {
    return this.homeworkService.getStudentDashboard(req.user.id);
  }

  @Get()
  async findAll(@Request() req, @Query() filters: any) {
    return this.homeworkService.findAll(req.user.id, req.user.role, filters);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.homeworkService.findOne(id, req.user.id);
  }

  @Post('submissions')
  @Roles('TEST_TAKER')
  async createSubmission(@Request() req, @Body() dto: CreateSubmissionDto) {
    return this.homeworkService.createSubmission(req.user.id, dto);
  }

  @Put('submissions/:id')
  @Roles('TEST_TAKER')
  async updateSubmission(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateSubmissionDto,
  ) {
    return this.homeworkService.updateSubmission(id, req.user.id, dto);
  }

  @Post('submissions/:id/submit')
  @Roles('TEST_TAKER')
  async submitHomework(@Param('id') id: string, @Request() req) {
    return this.homeworkService.submitHomework(id, req.user.id);
  }

  // ============================================================================
  // Teacher Endpoints
  // ============================================================================

  @Post()
  @Roles('INSTRUCTOR')
  async create(@Request() req, @Body() dto: CreateHomeworkDto) {
    return this.homeworkService.create(req.user.id, dto);
  }

  @Put(':id')
  @Roles('INSTRUCTOR')
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: Partial<CreateHomeworkDto>,
  ) {
    return this.homeworkService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @Roles('INSTRUCTOR')
  async delete(@Param('id') id: string, @Request() req) {
    return this.homeworkService.delete(id, req.user.id);
  }

  @Post('submissions/:id/grade')
  @Roles('INSTRUCTOR')
  async gradeSubmission(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: GradeSubmissionDto,
  ) {
    return this.homeworkService.gradeSubmission(id, req.user.id, dto);
  }

  @Get('teacher/dashboard')
  @Roles('INSTRUCTOR')
  async getTeacherDashboard(@Request() req) {
    return this.analyticsService.getTeacherDashboard(req.user.id);
  }

  // ============================================================================
  // Phase 3: Group Assignment Endpoints
  // ============================================================================

  @Post('groups')
  @Roles('TEST_TAKER', 'INSTRUCTOR')
  async createGroup(@Body() dto: CreateGroupDto) {
    return this.groupService.createGroup(dto);
  }

  @Get('groups/homework/:homeworkId')
  async getGroupsByHomework(@Param('homeworkId') homeworkId: string) {
    return this.groupService.findGroupsByHomework(homeworkId);
  }

  @Get('groups/:id')
  async getGroup(@Param('id') id: string) {
    return this.groupService.findGroupById(id);
  }

  @Post('groups/:id/members')
  async addGroupMember(@Param('id') id: string, @Body() dto: AddGroupMemberDto) {
    return this.groupService.addMember(id, dto);
  }

  @Delete('groups/:groupId/members/:studentId')
  async removeGroupMember(
    @Param('groupId') groupId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.groupService.removeMember(groupId, studentId);
  }

  @Post(':id/groups/auto-form')
  @Roles('INSTRUCTOR')
  async autoFormGroups(@Param('id') id: string, @Request() req) {
    return this.groupService.autoFormGroups(id, req.user.id);
  }

  @Get('groups/:id/analytics')
  async getGroupAnalytics(@Param('id') id: string) {
    return this.groupService.getGroupAnalytics(id);
  }

  // ============================================================================
  // Phase 3: Peer Review Endpoints
  // ============================================================================

  @Post(':id/peer-reviews/assign')
  @Roles('INSTRUCTOR')
  async assignPeerReviews(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: AssignPeerReviewsDto,
  ) {
    return this.peerReviewService.assignPeerReviews(dto, req.user.id);
  }

  @Post('peer-reviews')
  @Roles('TEST_TAKER')
  async createPeerReview(@Request() req, @Body() dto: CreatePeerReviewDto) {
    return this.peerReviewService.createReview(req.user.id, dto);
  }

  @Get(':id/peer-reviews/student')
  @Roles('TEST_TAKER')
  async getStudentPeerReviews(@Param('id') id: string, @Request() req) {
    return this.peerReviewService.findReviewsForStudent(req.user.id, id);
  }

  @Get(':id/peer-reviews/status')
  @Roles('INSTRUCTOR')
  async getPeerReviewStatus(@Param('id') id: string, @Request() req) {
    return this.peerReviewService.getPeerReviewStatus(id, req.user.userId);
  }

  // ============================================================================
  // Phase 3: Analytics Endpoints
  // ============================================================================

  @Post(':id/analytics/calculate')
  @Roles('INSTRUCTOR')
  async calculateAnalytics(@Param('id') id: string) {
    return this.analyticsService.calculateHomeworkAnalytics(id);
  }

  @Get('analytics/student/:studentId')
  @Roles('INSTRUCTOR', 'ADMIN')
  async getStudentPerformance(
    @Param('studentId') studentId: string,
    @Query('classId') classId?: string,
  ) {
    return this.analyticsService.getStudentPerformance(studentId, classId);
  }

  @Get('analytics/school')
  @Roles('ADMIN')
  async getSchoolAnalytics(@Request() req) {
    // Assumes user has organization_id in JWT
    return this.analyticsService.getSchoolAnalytics(req.user.organizationId);
  }
}
