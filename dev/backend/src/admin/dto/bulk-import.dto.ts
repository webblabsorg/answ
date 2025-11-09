import { IsArray, ValidateNested, IsString, IsEnum, IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

class QuestionImportDto {
  @ApiProperty()
  @IsString()
  exam_code: string;

  @ApiProperty()
  @IsString()
  question_text: string;

  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  question_type: QuestionType;

  @ApiProperty()
  @IsOptional()
  options?: any;

  @ApiProperty()
  correct_answer: any;

  @ApiProperty()
  @IsString()
  topic: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  subtopic?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty_level?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  explanation?: string;
}

export class BulkImportDto {
  @ApiProperty({ type: [QuestionImportDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionImportDto)
  questions: QuestionImportDto[];
}
