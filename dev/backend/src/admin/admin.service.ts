import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { BulkImportDto } from './dto/bulk-import.dto';
import { GradeEssayDto } from './dto/grade-essay.dto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  // ============================================================================
  // User Management
  // ============================================================================

  async getAllUsers(params?: {
    skip?: number;
    take?: number;
    role?: string;
    search?: string;
  }) {
    const { skip = 0, take = 50, role, search } = params || {};

    return this.prisma.user.findMany({
      where: {
        ...(role && { role: role as any }),
        ...(search && {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tier: true,
        is_verified: true,
        is_active: true,
        created_at: true,
        last_login_at: true,
      },
      orderBy: { created_at: 'desc' },
      skip,
      take,
    });
  }

  async updateUserRole(userId: string, dto: UpdateUserRoleDto, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: dto.role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tier: true,
      },
    });

    await this.auditLogs.create({
      userId: adminId,
      action: 'UPDATE_USER_ROLE',
      entityType: 'User',
      entityId: userId,
      changes: {
        old_role: user.role,
        new_role: dto.role,
      },
    });

    return updated;
  }

  async suspendUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { is_active: false },
    });

    await this.auditLogs.create({
      userId: adminId,
      action: 'SUSPEND_USER',
      entityType: 'User',
      entityId: userId,
    });

    return updated;
  }

  async activateUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { is_active: true },
    });

    await this.auditLogs.create({
      userId: adminId,
      action: 'ACTIVATE_USER',
      entityType: 'User',
      entityId: userId,
    });

    return updated;
  }

  // ============================================================================
  // Bulk Question Import
  // ============================================================================

  async bulkImportQuestions(dto: BulkImportDto, adminId: string) {
    const results = {
      total: dto.questions.length,
      success: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (const [index, questionData] of dto.questions.entries()) {
      try {
        // Find exam by code
        const exam = await this.prisma.exam.findUnique({
          where: { code: questionData.exam_code },
        });

        if (!exam) {
          results.failed++;
          results.errors.push({
            index,
            error: `Exam with code '${questionData.exam_code}' not found`,
          });
          continue;
        }

        // Create question
        await this.prisma.question.create({
          data: {
            exam_id: exam.id,
            question_text: questionData.question_text,
            question_type: questionData.question_type,
            options: questionData.options || null,
            correct_answer: questionData.correct_answer,
            topic: questionData.topic,
            subtopic: questionData.subtopic,
            difficulty_level: questionData.difficulty_level || 3,
            explanation: questionData.explanation,
            skills: [],
          },
        });

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          index,
          error: error.message,
        });
      }
    }

    await this.auditLogs.create({
      userId: adminId,
      action: 'BULK_IMPORT_QUESTIONS',
      entityType: 'Question',
      changes: {
        total: results.total,
        success: results.success,
        failed: results.failed,
      },
    });

    return results;
  }

  // ============================================================================
  // Essay Review
  // ============================================================================

  async getUnreviewedEssays(params?: { skip?: number; take?: number }) {
    const { skip = 0, take = 20 } = params || {};

    return this.prisma.attempt.findMany({
      where: {
        question: {
          question_type: 'ESSAY',
        },
        is_correct: null,
      },
      include: {
        question: {
          select: {
            id: true,
            question_text: true,
            topic: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        session: {
          select: {
            id: true,
            exam_id: true,
          },
        },
      },
      orderBy: { created_at: 'asc' },
      skip,
      take,
    });
  }

  async gradeEssay(attemptId: string, dto: GradeEssayDto, adminId: string) {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        question: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }

    if (attempt.question.question_type !== 'ESSAY') {
      throw new BadRequestException('This attempt is not an essay');
    }

    const updated = await this.prisma.attempt.update({
      where: { id: attemptId },
      data: {
        is_correct: dto.score >= 70, // Consider 70+ as passing
        user_answer: {
          ...(typeof attempt.user_answer === 'object' ? attempt.user_answer : {}),
          manual_score: dto.score,
          feedback: dto.feedback,
          rubric_scores: dto.rubric_scores,
          graded_by: adminId,
          graded_at: new Date(),
        },
      },
    });

    await this.auditLogs.create({
      userId: adminId,
      action: 'GRADE_ESSAY',
      entityType: 'Attempt',
      entityId: attemptId,
      changes: {
        score: dto.score,
        feedback: dto.feedback,
      },
    });

    return updated;
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  async getAdminStats() {
    const [totalUsers, activeUsers, totalQuestions, unreviewedEssays] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { is_active: true } }),
        this.prisma.question.count(),
        this.prisma.attempt.count({
          where: {
            question: { question_type: 'ESSAY' },
            is_correct: null,
          },
        }),
      ]);

    return {
      totalUsers,
      activeUsers,
      totalQuestions,
      unreviewedEssays,
    };
  }
}
