import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // ============================================================================
  // Homework Analytics Calculation
  // ============================================================================

  async calculateHomeworkAnalytics(homeworkId: string) {
    const homework = await this.prisma.homework.findUnique({
      where: { id: homeworkId },
      include: {
        submissions: {
          include: {
            group: {
              include: {
                members: true,
              },
            },
          },
        },
      },
    });

    if (!homework) {
      throw new NotFoundException('Homework not found');
    }

    const submissions = homework.submissions;
    const totalAssigned = submissions.length;
    const totalSubmitted = submissions.filter((s) => s.status === 'SUBMITTED' || s.status === 'GRADED').length;
    const totalGraded = submissions.filter((s) => s.status === 'GRADED').length;

    const onTimeSubmissions = submissions.filter(
      (s) => s.submitted_at && s.submitted_at <= homework.due_date,
    ).length;

    const scores = submissions.filter((s) => s.score !== null).map((s) => s.score!);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    const medianScore = scores.length > 0 ? this.calculateMedian(scores) : null;
    const stdDeviation = scores.length > 0 ? this.calculateStdDev(scores, avgScore!) : null;
    const minScore = scores.length > 0 ? Math.min(...scores) : null;
    const maxScore = scores.length > 0 ? Math.max(...scores) : null;

    // Calculate average time spent (from edit history)
    let totalTimeSpent = 0;
    let submissionsWithTime = 0;

    submissions.forEach((s) => {
      if (s.edit_history) {
        const history = s.edit_history as any[];
        if (history.length > 1) {
          const firstEdit = new Date(history[0].timestamp);
          const lastEdit = new Date(history[history.length - 1].timestamp);
          const timeSpent = (lastEdit.getTime() - firstEdit.getTime()) / 1000; // seconds
          totalTimeSpent += timeSpent;
          submissionsWithTime++;
        }
      }
    });

    const avgTimeSpent = submissionsWithTime > 0 ? totalTimeSpent / submissionsWithTime : null;

    // AI usage stats
    const aiAssistedCount = submissions.filter((s) => s.ai_assisted).length;
    const aiAssistUsage = totalAssigned > 0 ? (aiAssistedCount / totalAssigned) * 100 : null;

    const aiRequests = submissions
      .filter((s) => s.ai_usage_log)
      .map((s) => {
        const log = s.ai_usage_log as any;
        return log.requestCount || 0;
      });
    const avgAiRequests = aiRequests.length > 0
      ? aiRequests.reduce((a, b) => a + b, 0) / aiRequests.length
      : null;

    // Group/collaboration metrics
    let avgGroupSize = null;
    let collaborationScore = null;

    if (homework.is_group_assignment) {
      const groups = submissions.filter((s) => s.group_id).map((s) => s.group);
      const groupSizes = groups.map((g) => g?.members?.length || 0);
      avgGroupSize = groupSizes.length > 0
        ? groupSizes.reduce((a, b) => a + b, 0) / groupSizes.length
        : null;

      // Calculate collaboration score from edit histories
      const collabScores: number[] = [];
      submissions.forEach((s) => {
        if (s.edit_history && s.group_id) {
          const history = s.edit_history as any[];
          const editsPerMember = new Map<string, number>();

          history.forEach((edit) => {
            const userId = edit.userId;
            editsPerMember.set(userId, (editsPerMember.get(userId) || 0) + 1);
          });

          const counts = Array.from(editsPerMember.values());
          if (counts.length > 1) {
            const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
            const variance =
              counts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / counts.length;
            const stdDev = Math.sqrt(variance);
            const score = Math.max(0, 100 - stdDev * 10);
            collabScores.push(score);
          }
        }
      });

      collaborationScore = collabScores.length > 0
        ? collabScores.reduce((a, b) => a + b, 0) / collabScores.length
        : null;
    }

    // Save or update analytics
    const analytics = {
      homework_id: homeworkId,
      total_assigned: totalAssigned,
      total_submitted: totalSubmitted,
      total_graded: totalGraded,
      completion_rate: totalAssigned > 0 ? (totalSubmitted / totalAssigned) * 100 : null,
      on_time_rate: totalSubmitted > 0 ? (onTimeSubmissions / totalSubmitted) * 100 : null,
      avg_score: avgScore,
      median_score: medianScore,
      std_deviation: stdDeviation,
      min_score: minScore,
      max_score: maxScore,
      avg_time_spent: avgTimeSpent ? Math.round(avgTimeSpent) : null,
      ai_assist_usage: aiAssistUsage,
      avg_ai_requests: avgAiRequests,
      avg_group_size: avgGroupSize,
      collaboration_score: collaborationScore,
      last_calculated: new Date(),
    };

    await this.prisma.homeworkAnalytics.upsert({
      where: { homework_id: homeworkId },
      create: analytics,
      update: analytics,
    });

    return analytics;
  }

  // ============================================================================
  // Student Performance Analytics
  // ============================================================================

  async getStudentPerformance(studentId: string, classId?: string) {
    const where: any = {
      student_id: studentId,
      status: 'GRADED',
    };

    if (classId) {
      where.homework = {
        class_id: classId,
      };
    }

    const submissions = await this.prisma.homeworkSubmission.findMany({
      where,
      include: {
        homework: {
          select: {
            subject: true,
            homework_type: true,
            due_date: true,
          },
        },
      },
      orderBy: {
        graded_at: 'desc',
      },
    });

    const scores = submissions.map((s) => (s.score! / s.max_score!) * 100);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

    // Performance by subject
    const bySubject = submissions.reduce((acc, s) => {
      const subject = s.homework.subject;
      if (!acc[subject]) {
        acc[subject] = { count: 0, totalScore: 0, avgScore: 0 };
      }
      acc[subject].count++;
      acc[subject].totalScore += (s.score! / s.max_score!) * 100;
      acc[subject].avgScore = acc[subject].totalScore / acc[subject].count;
      return acc;
    }, {} as Record<string, any>);

    // Trend over time (last 10 submissions)
    const recentScores = scores.slice(0, 10);
    const trend = recentScores.length > 1 ? this.calculateTrend(recentScores) : null;

    // Strengths and weaknesses
    const sortedSubjects = Object.entries(bySubject).sort(
      ([, a], [, b]) => (b as any).avgScore - (a as any).avgScore,
    );

    return {
      totalSubmissions: submissions.length,
      averageScore: avgScore ? Math.round(avgScore * 10) / 10 : null,
      bySubject: Object.entries(bySubject).map(([subject, data]) => ({
        subject,
        ...(data as any),
        avgScore: Math.round((data as any).avgScore * 10) / 10,
      })),
      strengths: sortedSubjects.slice(0, 3).map(([subject]) => subject),
      weaknesses: sortedSubjects.slice(-3).reverse().map(([subject]) => subject),
      trend: trend ? (trend > 0 ? 'improving' : trend < 0 ? 'declining' : 'stable') : null,
      recentScores: recentScores.slice(0, 5),
    };
  }

  // ============================================================================
  // Teacher Dashboard Analytics
  // ============================================================================

  async getTeacherDashboard(teacherId: string) {
    const homeworks = await this.prisma.homework.findMany({
      where: {
        teacher_id: teacherId,
        is_active: true,
      },
      include: {
        submissions: true,
        analytics: true,
      },
    });

    const totalAssignments = homeworks.length;
    const activeAssignments = homeworks.filter((h) => h.due_date > new Date()).length;

    let totalPendingSubmissions = 0;
    let totalToGrade = 0;

    homeworks.forEach((h) => {
      const pending = h.submissions.filter((s) => s.status === 'NOT_STARTED' || s.status === 'IN_PROGRESS').length;
      const toGrade = h.submissions.filter((s) => s.status === 'SUBMITTED').length;
      totalPendingSubmissions += pending;
      totalToGrade += toGrade;
    });

    // Average grading time
    const gradedSubmissions = homeworks.flatMap((h) => h.submissions.filter((s) => s.graded_at));
    const gradingTimes = gradedSubmissions
      .filter((s) => s.submitted_at && s.graded_at)
      .map((s) => {
        const submitted = new Date(s.submitted_at!).getTime();
        const graded = new Date(s.graded_at!).getTime();
        return (graded - submitted) / (1000 * 60 * 60 * 24); // days
      });

    const avgGradingTime = gradingTimes.length > 0
      ? gradingTimes.reduce((a, b) => a + b, 0) / gradingTimes.length
      : null;

    // Completion rates
    const completionRates = homeworks
      .filter((h) => h.analytics)
      .map((h) => h.analytics!.completion_rate!)
      .filter((r) => r !== null);

    const avgCompletionRate = completionRates.length > 0
      ? completionRates.reduce((a, b) => a + b, 0) / completionRates.length
      : null;

    return {
      totalAssignments,
      activeAssignments,
      totalPendingSubmissions,
      totalToGrade,
      avgGradingTime: avgGradingTime ? Math.round(avgGradingTime * 10) / 10 : null,
      avgCompletionRate: avgCompletionRate ? Math.round(avgCompletionRate) : null,
      recentHomeworks: homeworks.slice(0, 5).map((h) => ({
        id: h.id,
        title: h.title,
        dueDate: h.due_date,
        submissionRate: h.analytics?.completion_rate || 0,
        toGrade: h.submissions.filter((s) => s.status === 'SUBMITTED').length,
      })),
    };
  }

  // ============================================================================
  // School-Wide Analytics (Admin)
  // ============================================================================

  async getSchoolAnalytics(organizationId: string) {
    const homeworks = await this.prisma.homework.findMany({
      where: {
        organization_id: organizationId,
      },
      include: {
        submissions: true,
        teacher: {
          select: { id: true, name: true },
        },
        analytics: true,
      },
    });

    const totalHomeworks = homeworks.length;
    const totalSubmissions = homeworks.reduce((sum, h) => sum + h.submissions.length, 0);
    const submittedCount = homeworks.reduce(
      (sum, h) => sum + h.submissions.filter((s) => s.status === 'SUBMITTED' || s.status === 'GRADED').length,
      0,
    );
    const gradedCount = homeworks.reduce(
      (sum, h) => sum + h.submissions.filter((s) => s.status === 'GRADED').length,
      0,
    );

    const overallCompletionRate = totalSubmissions > 0 ? (submittedCount / totalSubmissions) * 100 : 0;

    // Teacher utilization
    const teacherStats = homeworks.reduce((acc, h) => {
      const teacherId = h.teacher_id;
      if (!acc[teacherId]) {
        acc[teacherId] = {
          teacherId,
          teacherName: h.teacher.name,
          assignmentsCreated: 0,
          avgCompletionRate: 0,
          totalSubmissions: 0,
        };
      }
      acc[teacherId].assignmentsCreated++;
      acc[teacherId].totalSubmissions += h.submissions.length;
      return acc;
    }, {} as Record<string, any>);

    return {
      totalHomeworks,
      totalSubmissions,
      submittedCount,
      gradedCount,
      overallCompletionRate: Math.round(overallCompletionRate),
      teacherStats: Object.values(teacherStats),
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private calculateMedian(values: number[]): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private calculateStdDev(values: number[], mean: number): number {
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateTrend(values: number[]): number {
    // Simple linear regression slope
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = values.reduce((sum, _, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }
}
