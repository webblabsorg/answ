import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { LMSService } from './lms.service';

@Controller('lms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LMSController {
  constructor(private readonly lms: LMSService) {}

  @Get('providers')
  async providers() {
    return { providers: this.lms.listProviders() };
  }

  @Get('connect/:provider')
  @Roles('INSTRUCTOR', 'ADMIN')
  async connect(@Param('provider') provider: string, @Query('redirect') redirect?: string) {
    return {
      provider,
      url: `https://example.com/oauth/mock?provider=${encodeURIComponent(provider)}&redirect=${encodeURIComponent(redirect || '')}`,
    };
  }

  @Get('oauth/:provider/callback')
  @Roles('INSTRUCTOR', 'ADMIN')
  async oauthCallback(@Param('provider') provider: string, @Query('code') code?: string) {
    return { provider, connected: true, code: code || null };
  }

  @Post('disconnect/:provider')
  @Roles('INSTRUCTOR', 'ADMIN')
  async disconnect(@Param('provider') provider: string) {
    return { provider, disconnected: true };
  }

  @Get('courses/:provider')
  @Roles('INSTRUCTOR', 'ADMIN')
  async courses(@Param('provider') provider: string) {
    return { provider, courses: this.lms.getMockCourses(provider) };
  }

  @Post('map-class')
  @Roles('INSTRUCTOR', 'ADMIN')
  async mapClass(@Body() body: { classId: string; provider: string; courseId: string }) {
    return { success: true, mapping: body };
  }

  @Post('push-homework')
  @Roles('INSTRUCTOR', 'ADMIN')
  async pushHomework(@Body() body: { homeworkId: string }) {
    return { success: true, pushed: body.homeworkId };
  }
}
