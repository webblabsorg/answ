import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import * as Papa from 'papaparse';

@ApiTags('Admin - CSV Import')
@ApiBearerAuth()
@Controller('admin/csv')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
export class AdminCsvController {
  constructor(private readonly adminService: AdminService) {}

  @Post('questions/import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async importQuestionsFromCsv(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.originalname.endsWith('.csv')) {
      throw new BadRequestException('File must be a CSV');
    }

    // Parse CSV
    const csvContent = file.buffer.toString('utf-8');
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/ /g, '_'),
    });

    if (parseResult.errors.length > 0) {
      throw new BadRequestException(
        `CSV parse errors: ${parseResult.errors.map((e) => e.message).join(', ')}`,
      );
    }

    // Transform CSV data to BulkImportDto format
    const questions = parseResult.data.map((row: any, index: number) => {
      try {
        // Parse options if it's a JSON string
        let options = null;
        if (row.options) {
          try {
            options = typeof row.options === 'string' 
              ? JSON.parse(row.options) 
              : row.options;
          } catch (e) {
            console.warn(`Failed to parse options for row ${index + 1}`);
          }
        }

        // Parse correct answer
        let correctAnswer;
        try {
          correctAnswer = typeof row.correct_answer === 'string'
            ? JSON.parse(row.correct_answer)
            : row.correct_answer;
        } catch (e) {
          correctAnswer = { answer: row.correct_answer };
        }

        return {
          exam_code: row.exam_code,
          question_text: row.question_text,
          question_type: row.question_type?.toUpperCase(),
          options,
          correct_answer: correctAnswer,
          topic: row.topic,
          subtopic: row.subtopic || undefined,
          difficulty_level: row.difficulty_level 
            ? parseInt(row.difficulty_level) 
            : 3,
          explanation: row.explanation || undefined,
        };
      } catch (error) {
        console.error(`Error processing row ${index + 1}:`, error);
        throw new BadRequestException(`Error in row ${index + 1}: ${error.message}`);
      }
    });

    // Use existing bulk import service
    return this.adminService.bulkImportQuestions(
      { questions },
      user.id,
    );
  }

  @Post('questions/template')
  async downloadCsvTemplate() {
    const template = [
      {
        exam_code: 'GRE',
        question_text: 'What is 2 + 2?',
        question_type: 'MULTIPLE_CHOICE',
        options: JSON.stringify([
          { id: 'A', text: '3', correct: false },
          { id: 'B', text: '4', correct: true },
          { id: 'C', text: '5', correct: false },
          { id: 'D', text: '6', correct: false },
        ]),
        correct_answer: JSON.stringify({ answer: 'B' }),
        topic: 'Mathematics',
        subtopic: 'Arithmetic',
        difficulty_level: '2',
        explanation: '2 plus 2 equals 4',
      },
      {
        exam_code: 'SAT',
        question_text: 'Solve for x: 2x + 5 = 15',
        question_type: 'NUMERIC_INPUT',
        options: '',
        correct_answer: JSON.stringify({ answer: 5, tolerance: 0 }),
        topic: 'Algebra',
        subtopic: 'Linear Equations',
        difficulty_level: '3',
        explanation: 'Subtract 5 from both sides, then divide by 2',
      },
    ];

    return {
      template,
      csv: Papa.unparse(template),
      instructions: {
        required_columns: [
          'exam_code',
          'question_text',
          'question_type',
          'correct_answer',
          'topic',
        ],
        optional_columns: [
          'options',
          'subtopic',
          'difficulty_level',
          'explanation',
        ],
        question_types: [
          'MULTIPLE_CHOICE',
          'MULTIPLE_SELECT',
          'NUMERIC_INPUT',
          'TEXT_INPUT',
          'ESSAY',
          'TRUE_FALSE',
        ],
        notes: [
          'options and correct_answer should be JSON strings',
          'difficulty_level should be 1-5',
          'exam_code must match an existing exam (GRE, SAT, GMAT)',
        ],
      },
    };
  }
}
