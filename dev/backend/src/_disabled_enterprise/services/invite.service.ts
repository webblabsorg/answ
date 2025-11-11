import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizationRole, InviteStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

export interface CreateInviteDto {
  email: string;
  role?: OrganizationRole;
}

@Injectable()
export class InviteService {
  private readonly logger = new Logger(InviteService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create invitation
   */
  async createInvite(organizationId: string, userId: string, data: CreateInviteDto) {
    // Verify user has permission
    await this.verifyInvitePermission(organizationId, userId);

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check seat limits
    if (organization.used_seats >= organization.max_seats) {
      throw new BadRequestException('Organization has reached maximum seats');
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser && existingUser.organization_id === organizationId) {
      throw new BadRequestException('User is already a member of this organization');
    }

    // Check if invite already exists
    const existingInvite = await this.prisma.invite.findFirst({
      where: {
        organization_id: organizationId,
        email: data.email,
        status: InviteStatus.PENDING,
      },
    });

    if (existingInvite) {
      throw new BadRequestException('Invite already sent to this email');
    }

    // Generate token
    const token = randomBytes(32).toString('hex');

    // Create invite (expires in 7 days)
    const invite = await this.prisma.invite.create({
      data: {
        organization_id: organizationId,
        email: data.email,
        role: data.role || OrganizationRole.MEMBER,
        token,
        invited_by: userId,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    this.logger.log(`Invite created: ${data.email} -> ${organizationId}`);

    // TODO: Send invitation email

    return invite;
  }

  /**
   * Get invite by token
   */
  async getInviteByToken(token: string) {
    const invite = await this.prisma.invite.findUnique({
      where: { token },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logo_url: true,
          },
        },
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    // Check if expired
    if (invite.expires_at < new Date()) {
      if (invite.status === InviteStatus.PENDING) {
        await this.prisma.invite.update({
          where: { id: invite.id },
          data: { status: InviteStatus.EXPIRED },
        });
      }
      throw new BadRequestException('Invite has expired');
    }

    // Check if already used
    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException(`Invite has been ${invite.status.toLowerCase()}`);
    }

    return invite;
  }

  /**
   * Accept invitation
   */
  async acceptInvite(token: string, userId: string) {
    const invite = await this.getInviteByToken(token);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify email matches
    if (user.email !== invite.email) {
      throw new BadRequestException('Invite email does not match user email');
    }

    // Check if user already in an organization
    if (user.organization_id) {
      throw new BadRequestException('User is already a member of an organization');
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: invite.organization_id },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check seat limits
    if (organization.used_seats >= organization.max_seats) {
      throw new BadRequestException('Organization has reached maximum seats');
    }

    // Add user to organization with role from invite
    await this.prisma.user.update({
      where: { id: userId },
      data: { organization_id: invite.organization_id, organization_role: invite.role },
    });

    // Update used seats
    await this.prisma.organization.update({
      where: { id: invite.organization_id },
      data: { used_seats: { increment: 1 } },
    });

    // Update invite status
    await this.prisma.invite.update({
      where: { id: invite.id },
      data: {
        status: InviteStatus.ACCEPTED,
        accepted_at: new Date(),
      },
    });

    this.logger.log(`Invite accepted: ${user.email} -> ${invite.organization_id}`);

    return {
      message: 'Invite accepted successfully',
      organization: {
        id: organization.id,
        name: organization.name,
      },
    };
  }

  /**
   * Reject invitation
   */
  async rejectInvite(token: string, userId: string) {
    const invite = await this.getInviteByToken(token);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify email matches
    if (user.email !== invite.email) {
      throw new BadRequestException('Invite email does not match user email');
    }

    // Update invite status
    await this.prisma.invite.update({
      where: { id: invite.id },
      data: { status: InviteStatus.REJECTED },
    });

    this.logger.log(`Invite rejected: ${user.email} -> ${invite.organization_id}`);

    return { message: 'Invite rejected' };
  }

  /**
   * Cancel/revoke invitation
   */
  async revokeInvite(inviteId: string, userId: string) {
    const invite = await this.prisma.invite.findUnique({
      where: { id: inviteId },
      include: {
        organization: true,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    // Verify user has permission
    await this.verifyInvitePermission(invite.organization_id, userId);

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException('Can only revoke pending invites');
    }

    await this.prisma.invite.update({
      where: { id: inviteId },
      data: { status: InviteStatus.EXPIRED },
    });

    this.logger.log(`Invite revoked: ${inviteId}`);

    return { message: 'Invite revoked successfully' };
  }

  /**
   * Get organization invites
   */
  async getOrganizationInvites(organizationId: string, userId: string, status?: InviteStatus) {
    // Verify user has permission
    await this.verifyInvitePermission(organizationId, userId);

    const where: any = { organization_id: organizationId };
    if (status) {
      where.status = status;
    }

    const invites = await this.prisma.invite.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return invites;
  }

  /**
   * Get user invites
   */
  async getUserInvites(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const invites = await this.prisma.invite.findMany({
      where: {
        email: user.email,
        status: InviteStatus.PENDING,
        expires_at: {
          gte: new Date(),
        },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logo_url: true,
          },
        },
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return invites;
  }

  /**
   * Resend invitation
   */
  async resendInvite(inviteId: string, userId: string) {
    const invite = await this.prisma.invite.findUnique({
      where: { id: inviteId },
      include: {
        organization: true,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    // Verify user has permission
    await this.verifyInvitePermission(invite.organization_id, userId);

    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException('Can only resend pending invites');
    }

    // Update expiry
    await this.prisma.invite.update({
      where: { id: inviteId },
      data: {
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    this.logger.log(`Invite resent: ${inviteId}`);

    // TODO: Resend invitation email

    return { message: 'Invite resent successfully' };
  }

  /**
   * Verify user has permission to manage invites
   */
  private async verifyInvitePermission(organizationId: string, userId: string): Promise<void> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organization_id: true, organization_role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Owner and ORG ADMIN can manage invites
    const isOwner = organization.owner_id === userId;
    const isAdmin = user.organization_id === organizationId && user.organization_role === OrganizationRole.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Insufficient permissions to manage invites');
    }
  }
}
