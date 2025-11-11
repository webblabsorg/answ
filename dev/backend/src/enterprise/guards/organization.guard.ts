import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Guard to check if user belongs to an organization
 * and optionally has specific roles
 */
@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get organization_id from common locations
    const organizationId =
      request.params?.organizationId ||
      request.params?.id ||
      request.params?.orgId ||
      request.body?.organization_id ||
      request.query?.organization_id;

    if (!organizationId) {
      // If no organizationId specified, just check user has an organization
      const userData = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: {
          organization_id: true,
          organization_owned: {
            select: { id: true },
          },
        },
      });

      if (!userData?.organization_id && !userData?.organization_owned) {
        throw new ForbiddenException('User does not belong to an organization');
      }

      return true;
    }

    // Check if user has access to this organization
    const userData = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        organization_id: true,
        organization_owned: {
          select: { id: true },
        },
      },
    });

    const isOwner = userData?.organization_owned?.id === organizationId;
    const isMember = userData?.organization_id === organizationId;

    if (!isOwner && !isMember) {
      throw new ForbiddenException('User does not have access to this organization');
    }

    return true;
  }
}
