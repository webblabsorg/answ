import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TestSessionsService } from './test-sessions.service';
import { CreateTestSessionDto } from './dto/create-test-session.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QuotaGuard, RequireQuota } from '../billing/guards/quota.guard';

@ApiTags('Test Sessions')
@Controller('test-sessions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TestSessionsController {
  constructor(private readonly testSessionsService: TestSessionsService) {}

  @Post()
  @UseGuards(QuotaGuard)
  @RequireQuota('test', 1)
  @ApiOperation({ summary: 'Create a new test session' })
  create(@Request() req, @Body() createDto: CreateTestSessionDto) {
    return this.testSessionsService.create(req.user.id, createDto);
  }

  @Get('my-sessions')
  @ApiOperation({ summary: 'Get all sessions for current user' })
  getUserSessions(@Request() req) {
    return this.testSessionsService.getUserSessions(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get test session details' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.testSessionsService.findOne(id, req.user.id);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start a test session' })
  startSession(@Param('id') id: string, @Request() req) {
    return this.testSessionsService.startSession(id, req.user.id);
  }

  @Post(':id/submit-answer')
  @ApiOperation({ summary: 'Submit answer for a question' })
  submitAnswer(
    @Param('id') id: string,
    @Request() req,
    @Body() submitDto: SubmitAnswerDto,
  ) {
    return this.testSessionsService.submitAnswer(id, req.user.id, submitDto);
  }

  @Patch(':id/pause')
  @ApiOperation({ summary: 'Pause test session' })
  pauseSession(@Param('id') id: string, @Request() req) {
    return this.testSessionsService.pauseSession(id, req.user.id);
  }

  @Patch(':id/resume')
  @ApiOperation({ summary: 'Resume paused session' })
  resumeSession(@Param('id') id: string, @Request() req) {
    return this.testSessionsService.resumeSession(id, req.user.id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete and submit test session' })
  completeSession(@Param('id') id: string, @Request() req) {
    return this.testSessionsService.completeSession(id, req.user.id);
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Get test session results' })
  getResults(@Param('id') id: string, @Request() req) {
    return this.testSessionsService.getResults(id, req.user.id);
  }
}
