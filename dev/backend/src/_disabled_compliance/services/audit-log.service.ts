import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction } from '@prisma/client';
import { createHash } from 'crypto';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create immutable audit log entry with hash chain
   */
  async log(data: {
    organizationId?: string;
    userId?: string;
    action: AuditAction;
    resourceType: string;
    resourceId?: string;
    changes?: any;
    metadata?: any;
  }) {
    try {
      // Get previous log entry for hash chain
      const previousLog = await this.prisma.immutableAuditLog.findFirst({
        orderBy: { timestamp: 'desc' },
        select: { hash: true },
      });

      // Create hash of current entry
      const entryData = JSON.stringify({
        organizationId: data.organizationId,
        userId: data.userId,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        changes: data.changes,
        metadata: data.metadata,
        timestamp: new Date().toISOString(),
        previousHash: previousLog?.hash || 'GENESIS',
      });

      const hash = createHash('sha256').update(entryData).digest('hex');

      // Create audit log entry
      const log = await this.prisma.immutableAuditLog.create({
        data: {
          organization_id: data.organizationId,
          user_id: data.userId,
          action: data.action,
          resource_type: data.resourceType,
          resource_id: data.resourceId,
          changes: data.changes,
          metadata: data.metadata,
          hash,
          previous_hash: previousLog?.hash || 'GENESIS',
        },
      });

      return log;
    } catch (error) {
      this.logger.error('Failed to create audit log:', error);
      throw error;
    }
  }

  /**
   * Get audit logs for organization
   */
  async getOrganizationLogs(organizationId: string, limit = 100, offset = 0) {
    const logs = await this.prisma.immutableAuditLog.findMany({
      where: { organization_id: organizationId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
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

    return logs;
  }

  /**
   * Get audit logs for user
   */
  async getUserLogs(userId: string, limit = 100) {
    const logs = await this.prisma.immutableAuditLog.findMany({
      where: { user_id: userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return logs;
  }

  /**
   * Export audit logs as CSV
   */
  async exportLogsCSV(organizationId: string, startDate?: Date, endDate?: Date): Promise<string> {
    const where: any = { organization_id: organizationId };
    
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const logs = await this.prisma.immutableAuditLog.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Generate CSV
    const headers = ['Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'Changes', 'Hash'];
    const rows = logs.map((log) => [
      log.timestamp.toISOString(),
      log.user?.email || 'System',
      log.action,
      log.resource_type,
      log.resource_id || '',
      JSON.stringify(log.changes || {}),
      log.hash,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    return csv;
  }

  /**
   * Verify audit log integrity
   */
  async verifyIntegrity(startId?: string, endId?: string): Promise<{ valid: boolean; errors: string[] }> {
    const where: any = {};
    if (startId) where.id = { gte: startId };
    if (endId) where.id = { lte: endId };

    const logs = await this.prisma.immutableAuditLog.findMany({
      where,
      orderBy: { timestamp: 'asc' },
    });

    const errors: string[] = [];

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const previousLog = i > 0 ? logs[i - 1] : null;

      // Verify hash chain
      const expectedPreviousHash = previousLog?.hash || 'GENESIS';
      if (log.previous_hash !== expectedPreviousHash) {
        errors.push(`Hash chain broken at log ${log.id}: expected ${expectedPreviousHash}, got ${log.previous_hash}`);
      }

      // Verify hash
      const entryData = JSON.stringify({
        organizationId: log.organization_id,
        userId: log.user_id,
        action: log.action,
        resourceType: log.resource_type,
        resourceId: log.resource_id,
        changes: log.changes,
        metadata: log.metadata,
        timestamp: log.timestamp.toISOString(),
        previousHash: log.previous_hash,
      });

      const calculatedHash = createHash('sha256').update(entryData).digest('hex');
      if (calculatedHash !== log.hash) {
        errors.push(`Hash mismatch at log ${log.id}: expected ${calculatedHash}, got ${log.hash}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get audit statistics
   */
  async getStatistics(organizationId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalLogs, actionCounts, userActivity] = await Promise.all([
      this.prisma.immutableAuditLog.count({
        where: {
          organization_id: organizationId,
          timestamp: { gte: startDate },
        },
      }),
      this.prisma.immutableAuditLog.groupBy({
        by: ['action'],
        where: {
          organization_id: organizationId,
          timestamp: { gte: startDate },
        },
        _count: true,
      }),
      this.prisma.immutableAuditLog.groupBy({
        by: ['user_id'],
        where: {
          organization_id: organizationId,
          timestamp: { gte: startDate },
        },
        _count: true,
        orderBy: {
          _count: {
            user_id: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    return {
      total_logs: totalLogs,
      by_action: actionCounts,
      top_users: userActivity,
    };
  }
}
