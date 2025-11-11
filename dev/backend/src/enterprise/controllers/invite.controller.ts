import { Controller, Get, Post, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { InviteService, CreateInviteDto } from '../services/invite.service';
import { OrganizationGuard } from '../guards/organization.guard';
import { InviteStatus } from '@prisma/client';

@Controller('invites')
@UseGuards(JwtAuthGuard)
export class InviteController {
  constructor(private inviteService: InviteService) {}

  /**
   * Create invite
   * POST /invites
   */
  @Post()
  @UseGuards(OrganizationGuard)
  async createInvite(@CurrentUser() user: any, @Body() data: CreateInviteDto & { organization_id: string }) {
    return this.inviteService.createInvite(data.organization_id, user.id, data);
  }

  /**
   * Get invite by token
   * GET /invites/token/:token
   */
  @Get('token/:token')
  async getInviteByToken(@Param('token') token: string) {
    return this.inviteService.getInviteByToken(token);
  }

  /**
   * Accept invite
   * POST /invites/:token/accept
   */
  @Post(':token/accept')
  async acceptInvite(@Param('token') token: string, @CurrentUser() user: any) {
    return this.inviteService.acceptInvite(token, user.id);
  }

  /**
   * Reject invite
   * POST /invites/:token/reject
   */
  @Post(':token/reject')
  async rejectInvite(@Param('token') token: string, @CurrentUser() user: any) {
    return this.inviteService.rejectInvite(token, user.id);
  }

  /**
   * Revoke invite
   * DELETE /invites/:id
   */
  @Delete(':id')
  async revokeInvite(@Param('id') id: string, @CurrentUser() user: any) {
    return this.inviteService.revokeInvite(id, user.id);
  }

  /**
   * Get organization invites
   * GET /invites/organization/:organizationId
   */
  @Get('organization/:organizationId')
  @UseGuards(OrganizationGuard)
  async getOrganizationInvites(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: any,
    @Query('status') status?: InviteStatus,
  ) {
    return this.inviteService.getOrganizationInvites(organizationId, user.id, status);
  }

  /**
   * Get user invites
   * GET /invites/me
   */
  @Get('me')
  async getUserInvites(@CurrentUser() user: any) {
    return this.inviteService.getUserInvites(user.id);
  }

  /**
   * Resend invite
   * POST /invites/:id/resend
   */
  @Post(':id/resend')
  async resendInvite(@Param('id') id: string, @CurrentUser() user: any) {
    return this.inviteService.resendInvite(id, user.id);
  }
}
