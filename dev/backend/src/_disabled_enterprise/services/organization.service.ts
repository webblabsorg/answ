import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizationRole } from '@prisma/client';

export interface CreateOrganizationDto {
  name: string;
  slug: string;
  domain?: string;
  billing_email?: string;
  max_seats?: number;
}

export interface UpdateOrganizationDto {
  name?: string;
  domain?: string;
  logo_url?: string;
  billing_email?: string;
  max_seats?: number;
  primary_color?: string;
  secondary_color?: string;
  logo_light_url?: string;
  logo_dark_url?: string;
  sso_enabled?: boolean;
  api_access_enabled?: boolean;
  custom_branding?: boolean;
}

export interface OrganizationSettings {
  primary_color?: string;
  secondary_color?: string;
  logo_light_url?: string;
  logo_dark_url?: string;
  custom_domain?: string;
  sso_enabled: boolean;
  api_access_enabled: boolean;
  custom_branding: boolean;
}

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new organization
   */
  async createOrganization(ownerId: string, data: CreateOrganizationDto) {
    // Check if user already owns an organization
    const existingOrg = await this.prisma.organization.findFirst({
      where: { owner_id: ownerId },
    });

    if (existingOrg) {
      throw new BadRequestException('User already owns an organization');
    }

    // Check if slug is taken
    const slugExists = await this.prisma.organization.findUnique({
      where: { slug: data.slug },
    });

    if (slugExists) {
      throw new BadRequestException('Organization slug already taken');
    }

    // Check if domain is taken (if provided)
    if (data.domain) {
      const domainExists = await this.prisma.organization.findUnique({
        where: { domain: data.domain },
      });

      if (domainExists) {
        throw new BadRequestException('Domain already registered to another organization');
      }
    }

    // Create organization
    const organization = await this.prisma.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
        owner_id: ownerId,
        domain: data.domain,
        billing_email: data.billing_email,
        max_seats: data.max_seats || 10,
        used_seats: 1, // Owner counts as first seat
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update owner's organization_id
    await this.prisma.user.update({
      where: { id: ownerId },
      data: { organization_id: organization.id, organization_role: OrganizationRole.OWNER },
    });

    this.logger.log(`Organization created: ${organization.name} (${organization.id})`);

    return organization;
  }

  /**
   * Get organization by ID
   */
  async getOrganization(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            created_at: true,
          },
        },
        teams: {
          include: {
            members: true,
          },
        },
        _count: {
          select: {
            members: true,
            teams: true,
            invites: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  /**
   * Get organization by slug
   */
  async getOrganizationBySlug(slug: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { slug },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  /**
   * Update organization
   */
  async updateOrganization(organizationId: string, userId: string, data: UpdateOrganizationDto) {
    // Verify user is owner or admin
    await this.verifyOrganizationAccess(organizationId, userId, [OrganizationRole.OWNER, OrganizationRole.ADMIN]);

    const organization = await this.prisma.organization.update({
      where: { id: organizationId },
      data,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    this.logger.log(`Organization updated: ${organization.name} (${organization.id})`);

    return organization;
  }

  /**
   * Delete organization
   */
  async deleteOrganization(organizationId: string, userId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (organization.owner_id !== userId) {
      throw new ForbiddenException('Only the owner can delete the organization');
    }

    // Delete organization (cascade will handle members, teams, invites)
    await this.prisma.organization.delete({
      where: { id: organizationId },
    });

    this.logger.log(`Organization deleted: ${organization.name} (${organization.id})`);

    return { message: 'Organization deleted successfully' };
  }

  /**
   * Get organization settings
   */
  async getOrganizationSettings(organizationId: string): Promise<OrganizationSettings> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        primary_color: true,
        secondary_color: true,
        logo_light_url: true,
        logo_dark_url: true,
        custom_domain: true,
        sso_enabled: true,
        api_access_enabled: true,
        custom_branding: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  /**
   * Add member to organization
   */
  async addMember(organizationId: string, userId: string, memberId: string) {
    // Verify user has permission
    await this.verifyOrganizationAccess(organizationId, userId, [OrganizationRole.OWNER, OrganizationRole.ADMIN]);

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

    // Verify member exists and not in another org
    const member = await this.prisma.user.findUnique({ where: { id: memberId } });
    if (!member) {
      throw new NotFoundException('Member user not found');
    }
    if (member.organization_id && member.organization_id !== organizationId) {
      throw new BadRequestException('User already belongs to another organization');
    }

    // Add member
    await this.prisma.user.update({
      where: { id: memberId },
      data: { organization_id: organizationId, organization_role: OrganizationRole.MEMBER },
    });

    // Update used seats
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { used_seats: { increment: 1 } },
    });

    this.logger.log(`Member added to organization: ${memberId} -> ${organizationId}`);

    return { message: 'Member added successfully' };
  }

  /**
   * Remove member from organization
   */
  async removeMember(organizationId: string, userId: string, memberId: string) {
    // Verify user has permission
    await this.verifyOrganizationAccess(organizationId, userId, [OrganizationRole.OWNER, OrganizationRole.ADMIN]);

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Can't remove owner
    if (memberId === organization.owner_id) {
      throw new BadRequestException('Cannot remove organization owner');
    }

    // Ensure member currently belongs to this org
    const member = await this.prisma.user.findUnique({ where: { id: memberId } });
    if (!member) {
      throw new NotFoundException('Member user not found');
    }
    if (member.organization_id !== organizationId) {
      throw new BadRequestException('User is not a member of this organization');
    }

    // Remove member
    await this.prisma.user.update({
      where: { id: memberId },
      data: { organization_id: null, organization_role: null },
    });

    // Update used seats
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { used_seats: { decrement: 1 } },
    });

    this.logger.log(`Member removed from organization: ${memberId} <- ${organizationId}`);

    return { message: 'Member removed successfully' };
  }

  /**
   * Get organization members
   */
  async getMembers(organizationId: string, userId: string) {
    // Verify user has access
    await this.verifyOrganizationAccess(organizationId, userId, [OrganizationRole.OWNER, OrganizationRole.ADMIN, OrganizationRole.MEMBER, OrganizationRole.VIEWER]);

    const members = await this.prisma.user.findMany({
      where: { organization_id: organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organization_role: true,
        tier: true,
        created_at: true,
        team_memberships: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return members;
  }

  /**
   * Get organization stats
   */
  async getOrganizationStats(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: {
            members: true,
            teams: true,
            invites: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Get member activity stats
    const activeMembers = await this.prisma.user.count({
      where: {
        organization_id: organizationId,
        last_login_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    });

    // Get test activity
    const totalTests = await this.prisma.testSession.count({
      where: {
        user: {
          organization_id: organizationId,
        },
      },
    });

    return {
      total_members: organization._count.members,
      active_members: activeMembers,
      total_teams: organization._count.teams,
      pending_invites: organization._count.invites,
      used_seats: organization.used_seats,
      max_seats: organization.max_seats,
      seat_utilization: (organization.used_seats / organization.max_seats) * 100,
      total_tests: totalTests,
    };
  }

  /**
   * Verify user has access to organization
   */
  async verifyOrganizationAccess(
    organizationId: string,
    userId: string,
    allowedRoles: OrganizationRole[] | 'ALL' = 'ALL',
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        organization_id: true,
        organization_role: true,
        organization_owned: {
          select: { id: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isOwner = user.organization_owned?.id === organizationId;
    const isMember = user.organization_id === organizationId;

    if (!isOwner && !isMember) {
      throw new ForbiddenException('User does not have access to this organization');
    }

    // If specific roles required, check them strictly
    if (allowedRoles !== 'ALL') {
      if (isOwner) return; // Owner always allowed for org actions
      const role = (user.organization_role || 'MEMBER') as OrganizationRole;
      if (!allowedRoles.includes(role)) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }
  }

  /**
   * Get user's organization
   */
  async getUserOrganization(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                members: true,
                teams: true,
              },
            },
          },
        },
        organization_owned: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                members: true,
                teams: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Return owned organization first, otherwise member organization
    return user.organization_owned || user.organization;
  }
}
