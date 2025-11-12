import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { CreateSubmissionDto, UpdateSubmissionDto, GradeSubmissionDto } from './dto/create-submission.dto';
import { HomeworkType, SubmissionStatus } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class HomeworkService {
  constructor(private prisma: PrismaService) {}

  // ============================================================================
  // Homework CRUD
  // ============================================================================

  async create(teacherId: string, dto: CreateHomeworkDto) {
    const homework = await this.prisma.homework.create({
      data: {
        ...dto,
        teacher_id: teacherId,
        due_date: new Date(dto.due_date),
        lock_date: dto.lock_date ? new Date(dto.lock_date) : undefined,
        peer_review_due_date: dto.peer_review_due_date
          ? new Date(dto.peer_review_due_date)
          : undefined,
      },
      include: {
        teacher: {
          select: { id: true, name: true, email: true },
        },
        class: {
          select: { id: true, name: true, subject: true },
        },
      },
    });

    // If class assigned, create submissions for all enrolled students
    if (dto.class_id) {
      await this.createSubmissionsForClass(homework.id, dto.class_id);
    }

    return homework;
  }

  async findAll(userId: string, role: string, filters?: any) {
    const where: any = {};

    if (role === 'INSTRUCTOR') {
      where.teacher_id = userId;
    } else if (role === 'TEST_TAKER') {
      // Student: find assignments for their enrolled classes
      const enrollments = await this.prisma.classEnrollment.findMany({
        where: { student_id: userId },
        select: { class_id: true },
      });
      where.class_id = { in: enrollments.map((e) => e.class_id) };
    }

    if (filters?.subject) {
      where.subject = filters.subject;
    }

    if (filters?.homework_type) {
      where.homework_type = filters.homework_type;
    }

    return this.prisma.homework.findMany({
      where,
      include: {
        teacher: {
          select: { id: true, name: true },
        },
        class: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
      orderBy: { due_date: 'asc' },
    });
  }

  async findOne(id: string, userId: string) {
    const homework = await this.prisma.homework.findUnique({
      where: { id },
      include: {
        teacher: {
          select: { id: true, name: true, email: true },
        },
        class: {
          select: { id: true, name: true },
        },
        analytics: true,
      },
    });

    if (!homework) {
      throw new NotFoundException('Homework not found');
    }

    // Check access permissions
    const hasAccess = await this.checkAccess(homework.id, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    // Attach student's submission (if any)
    const submission = await this.prisma.homeworkSubmission.findFirst({
      where: { homework_id: id, student_id: userId },
      select: {
        id: true,
        status: true,
        submitted_at: true,
        graded_at: true,
        score: true,
        max_score: true,
        content: true,
        files: true,
        version_count: true,
      },
    });

    return { ...homework, submission } as any;
  }

  async update(id: string, teacherId: string, dto: Partial<CreateHomeworkDto>) {
    // Verify ownership
    const homework = await this.prisma.homework.findUnique({
      where: { id },
    });

    if (!homework || homework.teacher_id !== teacherId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.homework.update({
      where: { id },
      data: {
        ...dto,
        due_date: dto.due_date ? new Date(dto.due_date) : undefined,
        lock_date: dto.lock_date ? new Date(dto.lock_date) : undefined,
      },
    });
  }

  async delete(id: string, teacherId: string) {
    const homework = await this.prisma.homework.findUnique({
      where: { id },
    });

    if (!homework || homework.teacher_id !== teacherId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.homework.delete({ where: { id } });
  }

  // ============================================================================
  // Submissions
  // ============================================================================

  async createSubmission(studentId: string, dto: CreateSubmissionDto) {
    // Check if homework exists
    const homework = await this.prisma.homework.findUnique({
      where: { id: dto.homework_id },
    });

    if (!homework) {
      throw new NotFoundException('Homework not found');
    }

    // Check if student already has a submission
    const existing = await this.prisma.homeworkSubmission.findUnique({
      where: {
        homework_id_student_id: {
          homework_id: dto.homework_id,
          student_id: studentId,
        },
      },
    });

    if (existing) {
      // Update existing submission
      return this.updateSubmission(existing.id, studentId, {
        content: dto.content,
        files: dto.files,
        word_count: dto.word_count,
      });
    }

    // Create new submission
    const isLate = new Date() > homework.due_date;

    return this.prisma.homeworkSubmission.create({
      data: {
        homework_id: dto.homework_id,
        student_id: studentId,
        group_id: dto.group_id,
        content: dto.content,
        files: dto.files,
        word_count: dto.word_count,
        status: SubmissionStatus.IN_PROGRESS,
        is_late: isLate,
        max_score: homework.points,
      },
    });
  }

  async updateSubmission(
    submissionId: string,
    studentId: string,
    dto: UpdateSubmissionDto,
  ) {
    const submission = await this.prisma.homeworkSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission || submission.student_id !== studentId) {
      throw new ForbiddenException('Access denied');
    }

    // Track edit history for collaboration
    const editHistory = submission.edit_history as any[] || [];
    editHistory.push({
      userId: studentId,
      timestamp: new Date().toISOString(),
      changes: dto,
    });

    return this.prisma.homeworkSubmission.update({
      where: { id: submissionId },
      data: {
        ...dto,
        edit_history: editHistory,
        version_count: { increment: 1 },
      },
    });
  }

  async submitHomework(submissionId: string, studentId: string) {
    const submission = await this.prisma.homeworkSubmission.findUnique({
      where: { id: submissionId },
      include: { homework: true, extensions: { where: { status: 'APPROVED' }, orderBy: { approved_at: 'desc' } } },
    });

    if (!submission || submission.student_id !== studentId) {
      throw new ForbiddenException('Access denied');
    }

    let effectiveDue = submission.homework.due_date;
    const latestExt = submission.extensions?.[0];
    if (latestExt?.new_due_date) effectiveDue = latestExt.new_due_date as unknown as Date;
    const isLate = new Date() > effectiveDue;

    return this.prisma.homeworkSubmission.update({
      where: { id: submissionId },
      data: {
        status: SubmissionStatus.SUBMITTED,
        submitted_at: new Date(),
        is_late: isLate,
      },
    });
  }

  // ==========================================================================
  // Extension Requests
  // ==========================================================================

  async requestExtension(submissionId: string, studentId: string, reason?: string) {
    const submission = await this.prisma.homeworkSubmission.findUnique({ where: { id: submissionId }, include: { homework: true } });
    if (!submission || submission.student_id !== studentId) throw new ForbiddenException('Access denied');

    const existing = await this.prisma.extensionRequest.findFirst({ where: { submission_id: submissionId, student_id: studentId, status: 'PENDING' } });
    if (existing) return existing;

    return this.prisma.extensionRequest.create({
      data: { submission_id: submissionId, student_id: studentId, reason: reason || null },
    });
  }

  async approveExtension(submissionId: string, teacherId: string, newDue?: string, note?: string) {
    const submission = await this.prisma.homeworkSubmission.findUnique({ where: { id: submissionId }, include: { homework: true } });
    if (!submission || submission.homework.teacher_id !== teacherId) throw new ForbiddenException('Access denied');

    const pending = await this.prisma.extensionRequest.findFirst({ where: { submission_id: submissionId, status: 'PENDING' } });
    if (!pending) throw new NotFoundException('No pending extension');

    const approved = await this.prisma.extensionRequest.update({
      where: { id: pending.id },
      data: { status: 'APPROVED', approved_by: teacherId, approved_at: new Date(), new_due_date: newDue ? new Date(newDue) : submission.homework.due_date, teacher_note: note },
    });
    return approved;
  }

  async denyExtension(submissionId: string, teacherId: string, note?: string) {
    const submission = await this.prisma.homeworkSubmission.findUnique({ where: { id: submissionId }, include: { homework: true } });
    if (!submission || submission.homework.teacher_id !== teacherId) throw new ForbiddenException('Access denied');

    const pending = await this.prisma.extensionRequest.findFirst({ where: { submission_id: submissionId, status: 'PENDING' } });
    if (!pending) throw new NotFoundException('No pending extension');

    return this.prisma.extensionRequest.update({ where: { id: pending.id }, data: { status: 'DENIED', approved_by: teacherId, approved_at: new Date(), teacher_note: note } });
  }

  async getExtensionStatus(submissionId: string, userId: string) {
    const submission = await this.prisma.homeworkSubmission.findUnique({ where: { id: submissionId }, include: { homework: true } });
    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.student_id !== userId && submission.homework.teacher_id !== userId) throw new ForbiddenException('Access denied');
    const ext = await this.prisma.extensionRequest.findFirst({ where: { submission_id: submissionId }, orderBy: { requested_at: 'desc' } });
    return ext || { status: 'NONE' } as any;
  }

  async attachFilesToSubmission(
    submissionId: string,
    studentId: string,
    files: Express.Multer.File[],
  ) {
    const submission = await this.prisma.homeworkSubmission.findUnique({ where: { id: submissionId } });
    if (!submission || submission.student_id !== studentId) {
      throw new ForbiddenException('Access denied');
    }

    const baseUrl = process.env.PUBLIC_UPLOAD_BASE_URL || '/uploads';
    const current = (submission.files as any[]) || [];
    const toAdd = files.map((f) => ({
      originalname: f.originalname,
      filename: f.filename,
      mimetype: f.mimetype,
      size: f.size,
      url: `${baseUrl}/${f.filename}`,
      uploaded_at: new Date().toISOString(),
    }));

    const updated = await this.prisma.homeworkSubmission.update({
      where: { id: submissionId },
      data: { files: [...current, ...toAdd] },
    });

    return { id: updated.id, files: updated.files };
  }

  async removeFileFromSubmission(
    submissionId: string,
    studentId: string,
    filename: string,
  ) {
    const submission = await this.prisma.homeworkSubmission.findUnique({ where: { id: submissionId } });
    if (!submission || submission.student_id !== studentId) {
      throw new ForbiddenException('Access denied');
    }

    const files = ((submission.files as any[]) || []).filter((f) => f.filename !== filename);
    await this.prisma.homeworkSubmission.update({ where: { id: submissionId }, data: { files } });

    // Best-effort local file removal
    try {
      const filePath = path.resolve(process.cwd(), 'uploads', filename);
      if (filePath.startsWith(path.resolve(process.cwd(), 'uploads')) && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {}

    return { id: submissionId, removed: filename };
  }

  async gradeSubmission(
    submissionId: string,
    teacherId: string,
    dto: GradeSubmissionDto,
  ) {
    const submission = await this.prisma.homeworkSubmission.findUnique({
      where: { id: submissionId },
      include: { homework: true },
    });

    if (!submission || submission.homework.teacher_id !== teacherId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.homeworkSubmission.update({
      where: { id: submissionId },
      data: {
        score: dto.score,
        max_score: dto.max_score,
        rubric_scores: dto.rubric_scores,
        feedback: dto.feedback,
        teacher_comments: dto.teacher_comments,
        status: SubmissionStatus.GRADED,
        graded_at: new Date(),
      },
    });
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async createSubmissionsForClass(homeworkId: string, classId: string) {
    const enrollments = await this.prisma.classEnrollment.findMany({
      where: { class_id: classId },
    });

    const submissions = enrollments.map((enrollment) => ({
      homework_id: homeworkId,
      student_id: enrollment.student_id,
      status: SubmissionStatus.NOT_STARTED,
    }));

    await this.prisma.homeworkSubmission.createMany({
      data: submissions,
    });
  }

  private async checkAccess(homeworkId: string, userId: string): Promise<boolean> {
    const homework = await this.prisma.homework.findUnique({
      where: { id: homeworkId },
      include: {
        class: {
          include: {
            enrollments: {
              where: { student_id: userId },
            },
          },
        },
      },
    });

    if (!homework) return false;

    // Teacher owns the homework
    if (homework.teacher_id === userId) return true;

    // Student is enrolled in the class
    if (homework.class && homework.class.enrollments.length > 0) return true;

    return false;
  }

  async getStudentDashboard(studentId: string) {
    const enrollments = await this.prisma.classEnrollment.findMany({
      where: { student_id: studentId },
      select: { class_id: true },
    });

    const classIds = enrollments.map((e) => e.class_id);

    const submissions = await this.prisma.homeworkSubmission.findMany({
      where: {
        student_id: studentId,
      },
      include: {
        homework: {
          include: {
            class: true,
            teacher: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: {
        homework: { due_date: 'asc' },
      },
    });

    const now = new Date();

    const overdue = submissions.filter(
      (s) => s.homework.due_date < now && s.status !== SubmissionStatus.SUBMITTED,
    );

    const dueToday = submissions.filter((s) => {
      const due = s.homework.due_date;
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return due >= now && due < tomorrow && s.status !== SubmissionStatus.SUBMITTED;
    });

    const upcoming = submissions.filter((s) => {
      const due = s.homework.due_date;
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return due >= tomorrow && s.status !== SubmissionStatus.SUBMITTED;
    });

    const completed = submissions.filter(
      (s) => s.status === SubmissionStatus.GRADED,
    );

    const stats = {
      pending: submissions.filter((s) => s.status === SubmissionStatus.NOT_STARTED).length,
      dueToday: dueToday.length,
      completed: completed.length,
      avgScore:
        completed.length > 0
          ? (completed.reduce((sum, s) => sum + (s.score || 0), 0) / completed.length).toFixed(0) + '%'
          : 'N/A',
    };

    return {
      stats: [
        { label: 'Pending', value: stats.pending },
        { label: 'Due Today', value: stats.dueToday },
        { label: 'Completed', value: stats.completed },
        { label: 'Avg Score', value: stats.avgScore },
      ],
      overdue: overdue.map((s) => this.formatAssignment(s)),
      dueToday: dueToday.map((s) => this.formatAssignment(s)),
      upcoming: this.groupUpcoming(upcoming),
      completed: completed.map((s) => ({
        id: s.id,
        title: `${s.homework.subject} - ${s.homework.title}`,
        meta: `Submitted ${s.submitted_at?.toLocaleDateString()} • Score: ${s.score}/${s.max_score} • View Feedback`,
      })),
    };
  }

  private formatAssignment(submission: any) {
    return {
      id: submission.id,
      subject: submission.homework.subject,
      title: submission.homework.title,
      due: submission.homework.due_date.toLocaleDateString(),
      status: this.getStatusLabel(submission.status),
    };
  }

  private getStatusLabel(status: SubmissionStatus): string {
    const labels: Record<SubmissionStatus, string> = {
      NOT_STARTED: 'Not Started',
      IN_PROGRESS: 'In Progress',
      SUBMITTED: 'Submitted',
      UNDER_REVIEW: 'Under Review',
      GRADED: 'Graded',
      RETURNED: 'Returned',
      RESUBMITTED: 'Resubmitted',
    };
    return labels[status];
  }

  private groupUpcoming(submissions: any[]) {
    const groups: any[] = [];
    const now = new Date();

    const tomorrow = submissions.filter((s) => {
      const due = new Date(s.homework.due_date);
      const tom = new Date(now);
      tom.setDate(tom.getDate() + 1);
      const dayAfter = new Date(tom);
      dayAfter.setDate(dayAfter.getDate() + 1);
      return due >= tom && due < dayAfter;
    });

    if (tomorrow.length > 0) {
      groups.push({
        when: 'Tomorrow',
        items: tomorrow.map((s) => ({
          id: s.id,
          title: `${s.homework.subject} - ${s.homework.title}`,
          meta: `Due: ${s.homework.due_date.toLocaleDateString()} • ${this.getStatusLabel(s.status)}`,
        })),
      });
    }

    const thisWeek = submissions.filter((s) => {
      const due = new Date(s.homework.due_date);
      const weekFromNow = new Date(now);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      const dayAfter = new Date(now);
      dayAfter.setDate(dayAfter.getDate() + 2);
      return due >= dayAfter && due < weekFromNow;
    });

    if (thisWeek.length > 0) {
      groups.push({
        when: 'This Week',
        items: thisWeek.map((s) => ({
          id: s.id,
          title: `${s.homework.subject} - ${s.homework.title}`,
          meta: `Due: ${s.homework.due_date.toLocaleDateString()} • ${this.getStatusLabel(s.status)}`,
        })),
      });
    }

    return groups;
  }
}
