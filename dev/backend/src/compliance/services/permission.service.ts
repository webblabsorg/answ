import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PermissionScope, UserRole } from '@prisma/client';

@Injectable()
export class PermissionService {
  constructor(private prisma: PrismaService) {}

  async has(userId: string, organizationId: string, scope: PermissionScope): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === UserRole.ADMIN) return true;

    const has = await this.prisma.userPermission.findFirst({
      where: {
        user_id: userId,
        organization_id: organizationId,
        scope,
        OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
      },
    });
    return !!has;
  }

  async grant(params: { userId: string; organizationId: string; scope: PermissionScope; grantedBy: string; expiresAt?: Date }) {
    return this.prisma.userPermission.create({
      data: {
        user_id: params.userId,
        organization_id: params.organizationId,
        scope: params.scope,
        granted_by: params.grantedBy,
        expires_at: params.expiresAt,
      },
    });
  }

  async revoke(params: { userId: string; organizationId: string; scope: PermissionScope }) {
    return this.prisma.userPermission.delete({
      where: {
        user_id_organization_id_scope: {
          user_id: params.userId,
          organization_id: params.organizationId,
          scope: params.scope,
        },
      },
    });
  }
}
