import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Questions')
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new question (Admin only)' })
  create(@Body() createQuestionDto: CreateQuestionDto) {
    return this.questionsService.create(createQuestionDto);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk create questions (Admin only)' })
  bulkCreate(@Body() questions: CreateQuestionDto[]) {
    return this.questionsService.bulkCreate(questions);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all questions with filters' })
  @ApiQuery({ name: 'exam_id', required: false })
  @ApiQuery({ name: 'section_id', required: false })
  @ApiQuery({ name: 'topic', required: false })
  @ApiQuery({ name: 'difficulty_level', required: false, type: Number })
  @ApiQuery({ name: 'question_type', required: false })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  findAll(
    @Query('exam_id') exam_id?: string,
    @Query('section_id') section_id?: string,
    @Query('topic') topic?: string,
    @Query('difficulty_level') difficulty_level?: string,
    @Query('question_type') question_type?: string,
    @Query('is_active') is_active?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters: any = {};
    if (exam_id) filters.exam_id = exam_id;
    if (section_id) filters.section_id = section_id;
    if (topic) filters.topic = topic;
    if (difficulty_level) filters.difficulty_level = parseInt(difficulty_level);
    if (question_type) filters.question_type = question_type;
    if (is_active !== undefined) filters.is_active = is_active === 'true';
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    return this.questionsService.findAll(filters);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search questions' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'exam_id', required: false })
  search(@Query('q') query: string, @Query('exam_id') exam_id?: string) {
    return this.questionsService.search(query, exam_id);
  }

  @Get('random/:exam_id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get random questions for an exam' })
  @ApiQuery({ name: 'count', required: true, type: Number })
  @ApiQuery({ name: 'section_id', required: false })
  @ApiQuery({ name: 'difficulty_level', required: false, type: Number })
  @ApiQuery({ name: 'topic', required: false })
  getRandomQuestions(
    @Param('exam_id') exam_id: string,
    @Query('count') count: string,
    @Query('section_id') section_id?: string,
    @Query('difficulty_level') difficulty_level?: string,
    @Query('topic') topic?: string,
  ) {
    const options: any = {};
    if (section_id) options.section_id = section_id;
    if (difficulty_level) options.difficulty_level = parseInt(difficulty_level);
    if (topic) options.topic = topic;

    return this.questionsService.getRandomQuestions(exam_id, parseInt(count), options);
  }

  @Get('topics/:exam_id')
  @Public()
  @ApiOperation({ summary: 'Get all topics for an exam' })
  getTopics(@Param('exam_id') exam_id: string) {
    return this.questionsService.getTopics(exam_id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get question by ID' })
  findOne(@Param('id') id: string) {
    return this.questionsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update question (Admin only)' })
  update(@Param('id') id: string, @Body() updateQuestionDto: UpdateQuestionDto) {
    return this.questionsService.update(id, updateQuestionDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete question (Admin only)' })
  remove(@Param('id') id: string) {
    return this.questionsService.remove(id);
  }
}
