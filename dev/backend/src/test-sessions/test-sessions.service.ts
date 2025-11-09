import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionsService } from '../questions/questions.service';
import { GradingService } from '../grading/grading.service';
import { CreateTestSessionDto } from './dto/create-test-session.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

@Injectable()
export class TestSessionsService {
  constructor(
    private prisma: PrismaService,
    private questionsService: QuestionsService,
    private gradingService: GradingService,
  ) {}

  async create(userId: string, createDto: CreateTestSessionDto) {
    // Verify exam exists
    const exam = await this.prisma.exam.findUnique({
      where: { id: createDto.exam_id },
      include: { sections: true },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Get questions for the session
    const questionCount = createDto.question_count || exam.total_questions;
    const questions = await this.questionsService.getRandomQuestions(
      createDto.exam_id,
      questionCount,
      {
        section_id: createDto.section_id,
      }
    );

    if (questions.length === 0) {
      throw new BadRequestException('No questions available for this exam');
    }

    // Create test session
    const session = await this.prisma.testSession.create({
      data: {
        user_id: userId,
        exam_id: createDto.exam_id,
        status: 'NOT_STARTED',
        is_practice_mode: createDto.is_practice_mode || false,
        is_adaptive: createDto.is_adaptive || false,
        total_questions: questions.length,
        total_attempted: 0,
      },
      include: {
        exam: {
          select: {
            id: true,
            name: true,
            code: true,
            duration_minutes: true,
          },
        },
      },
    });

    // Create attempt records for all questions
    await this.prisma.attempt.createMany({
      data: questions.map((q, index) => ({
        session_id: session.id,
        user_id: userId,
        question_id: q.id,
      })),
    });

    return {
      session: {
        id: session.id,
        exam: session.exam,
        status: session.status,
        is_practice_mode: session.is_practice_mode,
        total_questions: session.total_questions,
        duration_minutes: session.exam.duration_minutes,
        created_at: session.created_at,
      },
      questions: questions.map((q, index) => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        topic: q.topic,
        difficulty_level: q.difficulty_level,
        time_estimate_seconds: q.time_estimate_seconds,
        order: index + 1,
      })),
    };
  }

  async findOne(sessionId: string, userId: string) {
    const session = await this.prisma.testSession.findUnique({
      where: { id: sessionId },
      include: {
        exam: {
          select: {
            id: true,
            name: true,
            code: true,
            duration_minutes: true,
          },
        },
        attempts: {
          include: {
            question: {
              select: {
                id: true,
                question_text: true,
                question_type: true,
                options: true,
                topic: true,
                difficulty_level: true,
                time_estimate_seconds: true,
              },
            },
          },
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Test session not found');
    }

    if (session.user_id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return {
      session: {
        id: session.id,
        exam: session.exam,
        status: session.status,
        is_practice_mode: session.is_practice_mode,
        total_questions: session.total_questions,
        total_attempted: session.total_attempted,
        started_at: session.started_at,
        duration_minutes: session.exam.duration_minutes,
      },
      questions: session.attempts.map((attempt, index) => ({
        id: attempt.question.id,
        question_text: attempt.question.question_text,
        question_type: attempt.question.question_type,
        options: attempt.question.options,
        topic: attempt.question.topic,
        difficulty_level: attempt.question.difficulty_level,
        time_estimate_seconds: attempt.question.time_estimate_seconds,
        user_answer: attempt.user_answer,
        is_flagged: attempt.is_flagged,
        time_spent_seconds: attempt.time_spent_seconds,
        order: index + 1,
      })),
    };
  }

  async startSession(sessionId: string, userId: string) {
    const session = await this.prisma.testSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Test session not found');
    }

    if (session.user_id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (session.status !== 'NOT_STARTED') {
      throw new BadRequestException('Session already started');
    }

    return this.prisma.testSession.update({
      where: { id: sessionId },
      data: {
        status: 'IN_PROGRESS',
        started_at: new Date(),
      },
    });
  }

  async submitAnswer(sessionId: string, userId: string, submitDto: SubmitAnswerDto) {
    // Verify session belongs to user
    const session = await this.prisma.testSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Test session not found');
    }

    if (session.user_id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (session.status === 'COMPLETED' || session.status === 'GRADED') {
      throw new BadRequestException('Cannot submit answer to completed session');
    }

    // Find or create attempt
    const existingAttempt = await this.prisma.attempt.findFirst({
      where: {
        session_id: sessionId,
        question_id: submitDto.question_id,
      },
    });

    if (!existingAttempt) {
      throw new NotFoundException('Attempt not found for this question');
    }

    // Update attempt
    const wasUnanswered = !existingAttempt.user_answer;
    const attempt = await this.prisma.attempt.update({
      where: { id: existingAttempt.id },
      data: {
        user_answer: submitDto.user_answer,
        time_spent_seconds: submitDto.time_spent_seconds,
        is_flagged: submitDto.is_flagged !== undefined ? submitDto.is_flagged : existingAttempt.is_flagged,
        updated_at: new Date(),
      },
    });

    // Update session attempted count if this was a new answer
    if (wasUnanswered && submitDto.user_answer) {
      await this.prisma.testSession.update({
        where: { id: sessionId },
        data: {
          total_attempted: {
            increment: 1,
          },
        },
      });
    }

    return attempt;
  }

  async pauseSession(sessionId: string, userId: string) {
    const session = await this.prisma.testSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Test session not found');
    }

    if (session.user_id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Session is not in progress');
    }

    return this.prisma.testSession.update({
      where: { id: sessionId },
      data: { status: 'PAUSED' },
    });
  }

  async resumeSession(sessionId: string, userId: string) {
    const session = await this.prisma.testSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Test session not found');
    }

    if (session.user_id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (session.status !== 'PAUSED') {
      throw new BadRequestException('Session is not paused');
    }

    return this.prisma.testSession.update({
      where: { id: sessionId },
      data: { status: 'IN_PROGRESS' },
    });
  }

  async completeSession(sessionId: string, userId: string) {
    const session = await this.prisma.testSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Test session not found');
    }

    if (session.user_id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (session.status === 'COMPLETED' || session.status === 'GRADED') {
      throw new BadRequestException('Session already completed');
    }

    // Mark as completed
    await this.prisma.testSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        completed_at: new Date(),
        submitted_at: new Date(),
      },
    });

    // Trigger auto-grading
    const results = await this.gradingService.gradeSession(sessionId);

    return results;
  }

  async getResults(sessionId: string, userId: string) {
    const session = await this.prisma.testSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Test session not found');
    }

    if (session.user_id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (session.status !== 'GRADED' && session.status !== 'COMPLETED') {
      throw new BadRequestException('Session not yet graded');
    }

    return this.gradingService.getSessionResults(sessionId);
  }

  async getUserSessions(userId: string) {
    return this.prisma.testSession.findMany({
      where: { user_id: userId },
      include: {
        exam: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 20,
    });
  }
}
