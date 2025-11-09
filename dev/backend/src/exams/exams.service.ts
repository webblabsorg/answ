import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';

@Injectable()
export class ExamsService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async create(createExamDto: CreateExamDto) {
    // Check if exam code already exists
    const existing = await this.prisma.exam.findUnique({
      where: { code: createExamDto.code },
    });

    if (existing) {
      throw new ConflictException('Exam code already exists');
    }

    return this.prisma.exam.create({
      data: createExamDto,
      include: {
        sections: true,
        _count: {
          select: { questions: true },
        },
      },
    });
  }

  async findAll(filters?: { category?: string; is_active?: boolean }) {
    const where: any = {};

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.is_active !== undefined) {
      where.is_active = filters.is_active;
    }

    return this.prisma.exam.findMany({
      where,
      include: {
        sections: {
          orderBy: { section_order: 'asc' },
        },
        _count: {
          select: { questions: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { section_order: 'asc' },
          include: {
            _count: {
              select: { questions: true },
            },
          },
        },
        _count: {
          select: { questions: true, test_sessions: true },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    return exam;
  }

  async findByCode(code: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { code },
      include: {
        sections: {
          orderBy: { section_order: 'asc' },
        },
        _count: {
          select: { questions: true },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    return exam;
  }

  async update(id: string, updateExamDto: UpdateExamDto) {
    // Check if exam exists
    await this.findOne(id);

    // If updating code, check for conflicts
    if (updateExamDto.code) {
      const existing = await this.prisma.exam.findUnique({
        where: { code: updateExamDto.code },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('Exam code already exists');
      }
    }

    return this.prisma.exam.update({
      where: { id },
      data: updateExamDto,
      include: {
        sections: true,
        _count: {
          select: { questions: true },
        },
      },
    });
  }

  async remove(id: string) {
    // Check if exam exists
    await this.findOne(id);

    return this.prisma.exam.delete({
      where: { id },
    });
  }

  async getStatistics(id: string) {
    const exam = await this.findOne(id);

    const stats = await this.prisma.$transaction([
      // Total questions
      this.prisma.question.count({
        where: { exam_id: id, is_active: true },
      }),
      // Total test sessions
      this.prisma.testSession.count({
        where: { exam_id: id },
      }),
      // Completed sessions
      this.prisma.testSession.count({
        where: { exam_id: id, status: 'GRADED' },
      }),
      // Average score
      this.prisma.testSession.aggregate({
        where: { exam_id: id, status: 'GRADED' },
        _avg: { scaled_score: true },
      }),
    ]);

    return {
      exam: {
        id: exam.id,
        name: exam.name,
        code: exam.code,
      },
      questions_count: stats[0],
      total_sessions: stats[1],
      completed_sessions: stats[2],
      average_score: stats[3]._avg.scaled_score || 0,
    };
  }
}
