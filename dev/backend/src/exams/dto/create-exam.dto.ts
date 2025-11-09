import { IsString, IsInt, IsEnum, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ExamCategory } from '@prisma/client';

export class CreateExamDto {
  @ApiProperty({ example: 'Graduate Record Examination' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'GRE' })
  @IsString()
  code: string;

  @ApiProperty({ enum: ExamCategory, example: 'STANDARDIZED_TEST' })
  @IsEnum(ExamCategory)
  category: ExamCategory;

  @ApiProperty({ example: 'Comprehensive test for graduate school admissions', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 180 })
  @IsInt()
  @Min(1)
  duration_minutes: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  total_sections: number;

  @ApiProperty({ example: 80 })
  @IsInt()
  @Min(1)
  total_questions: number;

  @ApiProperty({ example: 260, required: false })
  @IsOptional()
  @IsInt()
  passing_score?: number;
}
