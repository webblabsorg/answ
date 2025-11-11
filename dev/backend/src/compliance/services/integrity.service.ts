import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IntegrityService {
  private readonly logger = new Logger(IntegrityService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Track integrity event
   */
  async trackEvent(data: {
    testSessionId: string;
    userId: string;
    eventType: string;
    severity: 'low' | 'medium' | 'high';
    details?: any;
  }) {
    const event = await this.prisma.integrityEvent.create({
      data: {
        test_session_id: data.testSessionId,
        user_id: data.userId,
        event_type: data.eventType,
        severity: data.severity,
        details: data.details,
      },
    });

    this.logger.warn(
      `Integrity event: ${data.eventType} (${data.severity}) for session ${data.testSessionId}`,
    );

    return event;
  }

  /**
   * Get integrity events for test session
   */
  async getSessionEvents(testSessionId: string) {
    const events = await this.prisma.integrityEvent.findMany({
      where: { test_session_id: testSessionId },
      orderBy: { timestamp: 'asc' },
    });

    return events;
  }

  /**
   * Get integrity score for test session
   */
  async calculateIntegrityScore(testSessionId: string): Promise<number> {
    const events = await this.getSessionEvents(testSessionId);

    if (events.length === 0) {
      return 100; // Perfect score
    }

    // Calculate score based on severity and count
    let deductions = 0;
    for (const event of events) {
      switch (event.severity) {
        case 'high':
          deductions += 20;
          break;
        case 'medium':
          deductions += 10;
          break;
        case 'low':
          deductions += 3;
          break;
      }
    }

    const score = Math.max(0, 100 - deductions);
    return score;
  }

  /**
   * Get integrity statistics for user
   */
  async getUserIntegrityStats(userId: string) {
    const events = await this.prisma.integrityEvent.findMany({
      where: { user_id: userId },
    });

    const byType = events.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bySeverity = events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total_events: events.length,
      by_type: byType,
      by_severity: bySeverity,
    };
  }

  /**
   * Flag high-risk sessions
   */
  async getFlaggedSessions(organizationId?: string) {
    const where: any = {};
    
    if (organizationId) {
      where.test_session = {
        user: {
          organization_id: organizationId,
        },
      };
    }

    const highSeverityEvents = await this.prisma.integrityEvent.findMany({
      where: {
        ...where,
        severity: 'high',
      },
      include: {
        test_session: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            exam: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    return highSeverityEvents;
  }
}
