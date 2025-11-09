import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogData {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async create(data: AuditLogData) {
    return this.prisma.auditLog.create({
      data: {
        user_id: data.userId,
        action: data.action,
        entity_type: data.entityType,
        entity_id: data.entityId,
        changes: data.changes,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
      },
    });
  }

  async findAll(params?: {
    userId?: string;
    entityType?: string;
    action?: string;
    skip?: number;
    take?: number;
  }) {
    const { userId, entityType, action, skip = 0, take = 50 } = params || {};

    return this.prisma.auditLog.findMany({
      where: {
        ...(userId && { user_id: userId }),
        ...(entityType && { entity_type: entityType }),
        ...(action && { action }),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take,
    });
  }

  async findByEntity(entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        entity_type: entityType,
        entity_id: entityId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findByUser(userId: string, skip = 0, take = 50) {
    return this.prisma.auditLog.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      skip,
      take,
    });
  }
}
