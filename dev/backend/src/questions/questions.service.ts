import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  async create(createQuestionDto: CreateQuestionDto) {
    return this.prisma.question.create({
      data: createQuestionDto,
      include: {
        exam: { select: { name: true, code: true } },
        section: { select: { name: true } },
      },
    });
  }

  async findAll(filters?: {
    exam_id?: string;
    section_id?: string;
    topic?: string;
    difficulty_level?: number;
    question_type?: string;
    is_active?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters?.exam_id) where.exam_id = filters.exam_id;
    if (filters?.section_id) where.section_id = filters.section_id;
    if (filters?.topic) where.topic = { contains: filters.topic, mode: 'insensitive' };
    if (filters?.difficulty_level) where.difficulty_level = filters.difficulty_level;
    if (filters?.question_type) where.question_type = filters.question_type;
    if (filters?.is_active !== undefined) where.is_active = filters.is_active;

    const [questions, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        include: {
          exam: { select: { name: true, code: true } },
          section: { select: { name: true } },
        },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.question.count({ where }),
    ]);

    return {
      questions,
      total,
      limit: filters?.limit || 50,
      offset: filters?.offset || 0,
    };
  }

  async findOne(id: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: {
        exam: { select: { name: true, code: true } },
        section: { select: { name: true } },
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    return question;
  }

  async update(id: string, updateQuestionDto: UpdateQuestionDto) {
    // Check if question exists
    await this.findOne(id);

    return this.prisma.question.update({
      where: { id },
      data: updateQuestionDto,
      include: {
        exam: { select: { name: true, code: true } },
        section: { select: { name: true } },
      },
    });
  }

  async remove(id: string) {
    // Check if question exists
    await this.findOne(id);

    return this.prisma.question.delete({
      where: { id },
    });
  }

  async search(query: string, exam_id?: string) {
    const where: any = {
      question_text: {
        contains: query,
        mode: 'insensitive',
      },
      is_active: true,
    };

    if (exam_id) {
      where.exam_id = exam_id;
    }

    return this.prisma.question.findMany({
      where,
      include: {
        exam: { select: { name: true, code: true } },
        section: { select: { name: true } },
      },
      take: 20,
    });
  }

  async getRandomQuestions(
    exam_id: string,
    count: number,
    options?: {
      section_id?: string;
      difficulty_level?: number;
      topic?: string;
    }
  ) {
    const where: any = {
      exam_id,
      is_active: true,
    };

    if (options?.section_id) where.section_id = options.section_id;
    if (options?.difficulty_level) where.difficulty_level = options.difficulty_level;
    if (options?.topic) where.topic = options.topic;

    // Get total count
    const total = await this.prisma.question.count({ where });

    if (total === 0) {
      return [];
    }

    // Get random questions using random offset
    const randomOffset = Math.floor(Math.random() * Math.max(0, total - count));

    return this.prisma.question.findMany({
      where,
      take: count,
      skip: randomOffset,
      include: {
        exam: { select: { name: true, code: true } },
        section: { select: { name: true } },
      },
    });
  }

  async bulkCreate(questions: CreateQuestionDto[]) {
    const created = await this.prisma.$transaction(
      questions.map((q) => this.prisma.question.create({ data: q }))
    );

    return {
      created: created.length,
      questions: created,
    };
  }

  async getTopics(exam_id: string) {
    const topics = await this.prisma.question.groupBy({
      by: ['topic'],
      where: { exam_id, is_active: true },
      _count: { topic: true },
      orderBy: { _count: { topic: 'desc' } },
    });

    return topics.map((t) => ({
      topic: t.topic,
      count: t._count.topic,
    }));
  }
}
