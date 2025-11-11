import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { OrganizationService, CreateOrganizationDto, UpdateOrganizationDto } from '../services/organization.service';
import { OrganizationGuard } from '../guards/organization.guard';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(private organizationService: OrganizationService) {}

  /**
   * Create organization
   * POST /organizations
   */
  @Post()
  async createOrganization(@CurrentUser() user: any, @Body() data: CreateOrganizationDto) {
    return this.organizationService.createOrganization(user.id, data);
  }

  /**
   * Get current user's organization
   * GET /organizations/me
   */
  @Get('me')
  async getMyOrganization(@CurrentUser() user: any) {
    return this.organizationService.getUserOrganization(user.id);
  }

  /**
   * Get organization by ID
   * GET /organizations/:id
   */
  @Get(':id')
  @UseGuards(OrganizationGuard)
  async getOrganization(@Param('id') id: string, @CurrentUser() user: any) {
    return this.organizationService.getOrganization(id);
  }

  /**
   * Get organization by slug
   * GET /organizations/slug/:slug
   */
  @Get('slug/:slug')
  async getOrganizationBySlug(@Param('slug') slug: string) {
    return this.organizationService.getOrganizationBySlug(slug);
  }

  /**
   * Update organization
   * PUT /organizations/:id
   */
  @Put(':id')
  @UseGuards(OrganizationGuard)
  async updateOrganization(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() data: UpdateOrganizationDto,
  ) {
    return this.organizationService.updateOrganization(id, user.id, data);
  }

  /**
   * Delete organization
   * DELETE /organizations/:id
   */
  @Delete(':id')
  @UseGuards(OrganizationGuard)
  async deleteOrganization(@Param('id') id: string, @CurrentUser() user: any) {
    return this.organizationService.deleteOrganization(id, user.id);
  }

  /**
   * Get organization settings
   * GET /organizations/:id/settings
   */
  @Get(':id/settings')
  @UseGuards(OrganizationGuard)
  async getOrganizationSettings(@Param('id') id: string) {
    return this.organizationService.getOrganizationSettings(id);
  }

  /**
   * Get organization members
   * GET /organizations/:id/members
   */
  @Get(':id/members')
  @UseGuards(OrganizationGuard)
  async getMembers(@Param('id') id: string, @CurrentUser() user: any) {
    return this.organizationService.getMembers(id, user.id);
  }

  /**
   * Add member to organization
   * POST /organizations/:id/members
   */
  @Post(':id/members')
  @UseGuards(OrganizationGuard)
  async addMember(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('user_id') memberId: string,
  ) {
    return this.organizationService.addMember(id, user.id, memberId);
  }

  /**
   * Remove member from organization
   * DELETE /organizations/:id/members/:memberId
   */
  @Delete(':id/members/:memberId')
  @UseGuards(OrganizationGuard)
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: any,
  ) {
    return this.organizationService.removeMember(id, user.id, memberId);
  }

  /**
   * Get organization stats
   * GET /organizations/:id/stats
   */
  @Get(':id/stats')
  @UseGuards(OrganizationGuard)
  async getOrganizationStats(@Param('id') id: string) {
    return this.organizationService.getOrganizationStats(id);
  }
}
