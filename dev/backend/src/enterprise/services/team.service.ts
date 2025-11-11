import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizationRole } from '@prisma/client';

export interface CreateTeamDto {
  name: string;
  description?: string;
}

export interface UpdateTeamDto {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface AddTeamMemberDto {
  user_id: string;
  role?: OrganizationRole;
}

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new team
   */
  async createTeam(organizationId: string, userId: string, data: CreateTeamDto) {
    // Verify user has permission
    await this.verifyTeamManagementPermission(organizationId, userId);

    const team = await this.prisma.team.create({
      data: {
        organization_id: organizationId,
        name: data.name,
        description: data.description,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    this.logger.log(`Team created: ${team.name} in organization ${organizationId}`);

    return team;
  }

  /**
   * Get team by ID
   */
  async getTeam(teamId: string, userId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Verify user has access to this organization
    await this.verifyOrganizationAccess(team.organization_id, userId);

    return team;
  }

  /**
   * Get all teams in an organization
   */
  async getOrganizationTeams(organizationId: string, userId: string) {
    // Verify user has access
    await this.verifyOrganizationAccess(organizationId, userId);

    const teams = await this.prisma.team.findMany({
      where: {
        organization_id: organizationId,
        is_active: true,
      },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return teams;
  }

  /**
   * Update team
   */
  async updateTeam(teamId: string, userId: string, data: UpdateTeamDto) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Verify user has permission
    await this.verifyTeamManagementPermission(team.organization_id, userId);

    const updatedTeam = await this.prisma.team.update({
      where: { id: teamId },
      data,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    this.logger.log(`Team updated: ${updatedTeam.name} (${teamId})`);

    return updatedTeam;
  }

  /**
   * Delete team
   */
  async deleteTeam(teamId: string, userId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Verify user has permission
    await this.verifyTeamManagementPermission(team.organization_id, userId);

    await this.prisma.team.delete({
      where: { id: teamId },
    });

    this.logger.log(`Team deleted: ${team.name} (${teamId})`);

    return { message: 'Team deleted successfully' };
  }

  /**
   * Add member to team
   */
  async addTeamMember(teamId: string, userId: string, data: AddTeamMemberDto) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Verify user has permission
    await this.verifyTeamManagementPermission(team.organization_id, userId);

    // Verify the member belongs to the organization
    const member = await this.prisma.user.findUnique({
      where: { id: data.user_id },
    });

    if (!member || member.organization_id !== team.organization_id) {
      throw new BadRequestException('User is not a member of this organization');
    }

    // Check if already a member
    const existing = await this.prisma.teamMember.findUnique({
      where: {
        team_id_user_id: {
          team_id: teamId,
          user_id: data.user_id,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('User is already a member of this team');
    }

    // Add member
    const teamMember = await this.prisma.teamMember.create({
      data: {
        team_id: teamId,
        user_id: data.user_id,
        role: data.role || OrganizationRole.MEMBER,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    this.logger.log(`Member added to team: ${data.user_id} -> ${teamId}`);

    return teamMember;
  }

  /**
   * Remove member from team
   */
  async removeTeamMember(teamId: string, userId: string, memberId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Verify user has permission
    await this.verifyTeamManagementPermission(team.organization_id, userId);

    const teamMember = await this.prisma.teamMember.findUnique({
      where: {
        team_id_user_id: {
          team_id: teamId,
          user_id: memberId,
        },
      },
    });

    if (!teamMember) {
      throw new NotFoundException('Team member not found');
    }

    await this.prisma.teamMember.delete({
      where: {
        id: teamMember.id,
      },
    });

    this.logger.log(`Member removed from team: ${memberId} <- ${teamId}`);

    return { message: 'Team member removed successfully' };
  }

  /**
   * Update team member role
   */
  async updateTeamMemberRole(teamId: string, userId: string, memberId: string, role: OrganizationRole) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Verify user has permission
    await this.verifyTeamManagementPermission(team.organization_id, userId);

    const teamMember = await this.prisma.teamMember.findUnique({
      where: {
        team_id_user_id: {
          team_id: teamId,
          user_id: memberId,
        },
      },
    });

    if (!teamMember) {
      throw new NotFoundException('Team member not found');
    }

    const updated = await this.prisma.teamMember.update({
      where: { id: teamMember.id },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    this.logger.log(`Team member role updated: ${memberId} in ${teamId} -> ${role}`);

    return updated;
  }

  /**
   * Get team members
   */
  async getTeamMembers(teamId: string, userId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Verify user has access
    await this.verifyOrganizationAccess(team.organization_id, userId);

    const members = await this.prisma.teamMember.findMany({
      where: { team_id: teamId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            created_at: true,
          },
        },
      },
      orderBy: {
        joined_at: 'desc',
      },
    });

    return members;
  }

  /**
   * Get user's teams
   */
  async getUserTeams(userId: string) {
    const teams = await this.prisma.teamMember.findMany({
      where: { user_id: userId },
      include: {
        team: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
      },
      orderBy: {
        joined_at: 'desc',
      },
    });

    return teams.map((tm) => ({
      ...tm.team,
      user_role: tm.role,
      joined_at: tm.joined_at,
    }));
  }

  /**
   * Verify user has permission to manage teams
   */
  private async verifyTeamManagementPermission(organizationId: string, userId: string): Promise<void> {
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

    // Owner and ORG ADMIN can manage teams
    const isOwner = organization.owner_id === userId;
    const isAdmin = user.organization_id === organizationId && user.organization_role === OrganizationRole.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Insufficient permissions to manage teams');
    }
  }

  /**
   * Verify user has access to organization
   */
  private async verifyOrganizationAccess(organizationId: string, userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        organization_id: true,
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
  }
}
