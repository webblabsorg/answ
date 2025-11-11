import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Patch } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { TeamService, CreateTeamDto, UpdateTeamDto, AddTeamMemberDto } from '../services/team.service';
import { OrganizationGuard } from '../guards/organization.guard';
import { OrganizationRole } from '@prisma/client';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamController {
  constructor(private teamService: TeamService) {}

  /**
   * Create team
   * POST /teams
   */
  @Post()
  @UseGuards(OrganizationGuard)
  async createTeam(@CurrentUser() user: any, @Body() data: CreateTeamDto & { organization_id: string }) {
    return this.teamService.createTeam(data.organization_id, user.id, data);
  }

  /**
   * Get team by ID
   * GET /teams/:id
   */
  @Get(':id')
  async getTeam(@Param('id') id: string, @CurrentUser() user: any) {
    return this.teamService.getTeam(id, user.id);
  }

  /**
   * Get organization teams
   * GET /teams/organization/:organizationId
   */
  @Get('organization/:organizationId')
  @UseGuards(OrganizationGuard)
  async getOrganizationTeams(@Param('organizationId') organizationId: string, @CurrentUser() user: any) {
    return this.teamService.getOrganizationTeams(organizationId, user.id);
  }

  /**
   * Get user's teams
   * GET /teams/me/all
   */
  @Get('me/all')
  async getUserTeams(@CurrentUser() user: any) {
    return this.teamService.getUserTeams(user.id);
  }

  /**
   * Update team
   * PUT /teams/:id
   */
  @Put(':id')
  async updateTeam(@Param('id') id: string, @CurrentUser() user: any, @Body() data: UpdateTeamDto) {
    return this.teamService.updateTeam(id, user.id, data);
  }

  /**
   * Delete team
   * DELETE /teams/:id
   */
  @Delete(':id')
  async deleteTeam(@Param('id') id: string, @CurrentUser() user: any) {
    return this.teamService.deleteTeam(id, user.id);
  }

  /**
   * Get team members
   * GET /teams/:id/members
   */
  @Get(':id/members')
  async getTeamMembers(@Param('id') id: string, @CurrentUser() user: any) {
    return this.teamService.getTeamMembers(id, user.id);
  }

  /**
   * Add team member
   * POST /teams/:id/members
   */
  @Post(':id/members')
  async addTeamMember(@Param('id') id: string, @CurrentUser() user: any, @Body() data: AddTeamMemberDto) {
    return this.teamService.addTeamMember(id, user.id, data);
  }

  /**
   * Remove team member
   * DELETE /teams/:id/members/:memberId
   */
  @Delete(':id/members/:memberId')
  async removeTeamMember(@Param('id') id: string, @Param('memberId') memberId: string, @CurrentUser() user: any) {
    return this.teamService.removeTeamMember(id, user.id, memberId);
  }

  /**
   * Update team member role
   * PATCH /teams/:id/members/:memberId/role
   */
  @Patch(':id/members/:memberId/role')
  async updateTeamMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: any,
    @Body('role') role: OrganizationRole,
  ) {
    return this.teamService.updateTeamMemberRole(id, user.id, memberId, role);
  }
}
