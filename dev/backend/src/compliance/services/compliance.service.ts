import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { promises as fs } from 'fs';
import { join, basename } from 'path';

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Handle GDPR Data Subject Access Request (DSAR)
   */
  async createDataExportRequest(userId: string, requestType: 'export' | 'delete') {
    const request = await this.prisma.dataExportRequest.create({
      data: {
        user_id: userId,
        request_type: requestType,
        status: 'pending',
      },
    });

    this.logger.log(`DSAR request created: ${requestType} for user ${userId}`);

    // Trigger async processing
    this.processDataRequest(request.id).catch((error) => {
      this.logger.error(`Failed to process DSAR request ${request.id}:`, error);
    });

    return request;
  }

  /**
   * Process data export/delete request
   */
  private async processDataRequest(requestId: string) {
    const request = await this.prisma.dataExportRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return;
    }

    try {
      await this.prisma.dataExportRequest.update({
        where: { id: requestId },
        data: { status: 'processing' },
      });

      if (request.request_type === 'export') {
        await this.exportUserData(request.user_id, requestId);
      } else if (request.request_type === 'delete') {
        await this.deleteUserData(request.user_id, requestId);
      }

      await this.prisma.dataExportRequest.update({
        where: { id: requestId },
        data: {
          status: 'completed',
          completed_at: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to process request ${requestId}:`, error);
      await this.prisma.dataExportRequest.update({
        where: { id: requestId },
        data: { status: 'failed' },
      });
    }
  }

  /**
   * Export all user data (GDPR Article 15)
   */
  private async exportUserData(userId: string, requestId: string) {
    // Collect all user data
    const [user, testSessions, subscriptions, usage, conversations, irtProfile] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          organization: true,
          team_memberships: {
            include: {
              team: true,
            },
          },
        },
      }),
      this.prisma.testSession.findMany({
        where: { user_id: userId },
        include: {
          attempts: true,
        },
      }),
      this.prisma.subscription.findMany({
        where: { user_id: userId },
      }),
      this.prisma.usageRecord.findMany({
        where: { user_id: userId },
      }),
      this.prisma.conversation.findMany({
        where: { user_id: userId },
        include: {
          messages: true,
        },
      }),
      this.prisma.iRTProfile.findMany({
        where: { user_id: userId },
      }),
    ]);

    const exportData = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tier: user.tier,
        created_at: user.created_at,
        organization: user.organization,
        teams: user.team_memberships,
      },
      test_sessions: testSessions,
      subscriptions,
      usage,
      conversations,
      irt_profile: irtProfile,
      export_date: new Date().toISOString(),
    };

    // Save to file (in production, upload to S3)
    const filename = `user_data_export_${userId}_${Date.now()}.json`;
    const exportDir = join(process.cwd(), 'exports');
    const filepath = join(exportDir, filename);

    // Ensure directory exists and write file
    await fs.mkdir(exportDir, { recursive: true });
    await fs.writeFile(filepath, JSON.stringify(exportData, null, 2), 'utf8');

    // In production, upload to object storage and store signed URL
    await this.prisma.dataExportRequest.update({
      where: { id: requestId },
      data: {
        download_url: `/compliance/downloads/${filename}`,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    this.logger.log(`Data export completed for user ${userId}`);
  }

  /**
   * Delete all user data (GDPR Article 17 - Right to be forgotten)
   */
  private async deleteUserData(userId: string, requestId: string) {
    // Anonymize or delete user data
    // Keep some data for legal/compliance reasons (financial records)

    await this.prisma.$transaction([
      // Delete personal data
      this.prisma.conversation.deleteMany({ where: { user_id: userId } }),
      this.prisma.iRTProfile.deleteMany({ where: { user_id: userId } }),
      this.prisma.usageRecord.deleteMany({ where: { user_id: userId } }),
      
      // Anonymize test sessions (keep for statistical purposes)
      this.prisma.testSession.updateMany({
        where: { user_id: userId },
        data: { user_id: 'DELETED_USER' },
      }),
      
      // Keep subscription data (financial records - 7 years retention)
      // But anonymize personal info
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: `deleted_${userId}@example.com`,
          name: 'Deleted User',
          password_hash: 'DELETED',
          is_active: false,
        },
      }),
    ]);

    this.logger.log(`Data deletion completed for user ${userId}`);
  }

  /**
   * Get data retention summary
   */
  async getRetentionSummary() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const [recentTests, oldTests, veryOldTests, oldConversations] = await Promise.all([
      this.prisma.testSession.count({
        where: { created_at: { gte: thirtyDaysAgo } },
      }),
      this.prisma.testSession.count({
        where: { created_at: { lt: thirtyDaysAgo, gte: ninetyDaysAgo } },
      }),
      this.prisma.testSession.count({
        where: { created_at: { lt: oneYearAgo } },
      }),
      this.prisma.conversation.count({
        where: { created_at: { lt: ninetyDaysAgo } },
      }),
    ]);

    return {
      test_sessions: {
        last_30_days: recentTests,
        30_90_days: oldTests,
        over_1_year: veryOldTests,
        archival_candidates: veryOldTests,
      },
      conversations: {
        archival_candidates: oldConversations,
      },
    };
  }

  /**
   * Get pending DSAR requests
   */
  async getPendingRequests() {
    const requests = await this.prisma.dataExportRequest.findMany({
      where: {
        status: { in: ['pending', 'processing'] },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    return requests;
  }

  /**
   * Get user's DSAR requests
   */
  async getUserRequests(userId: string) {
    const requests = await this.prisma.dataExportRequest.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    return requests;
  }
}
