import { IsString, IsEnum, IsInt, IsOptional, IsArray, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';

export class CreateQuestionDto {
  @ApiProperty({ example: 'cuid123' })
  @IsString()
  exam_id: string;

  @ApiProperty({ example: 'cuid456', required: false })
  @IsOptional()
  @IsString()
  section_id?: string;

  @ApiProperty({ example: 'What is the capital of France?' })
  @IsString()
  question_text: string;

  @ApiProperty({ enum: QuestionType, example: 'MULTIPLE_CHOICE' })
  @IsEnum(QuestionType)
  question_type: QuestionType;

  @ApiProperty({
    example: [
      { id: 'A', text: 'Paris', correct: true },
      { id: 'B', text: 'London', correct: false },
      { id: 'C', text: 'Berlin', correct: false },
      { id: 'D', text: 'Madrid', correct: false }
    ],
    required: false
  })
  @IsOptional()
  options?: any;

  @ApiProperty({ example: { answer: 'A' } })
  correct_answer: any;

  @ApiProperty({ example: 3, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty_level: number;

  @ApiProperty({ example: 'Geography' })
  @IsString()
  topic: string;

  @ApiProperty({ example: 'European Capitals', required: false })
  @IsOptional()
  @IsString()
  subtopic?: string;

  @ApiProperty({ example: ['geography', 'capital-cities'], required: false })
  @IsOptional()
  @IsArray()
  skills?: string[];

  @ApiProperty({ example: 'Paris is the capital and largest city of France.', required: false })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiProperty({ example: 'https://example.com/video.mp4', required: false })
  @IsOptional()
  @IsString()
  explanation_video_url?: string;

  @ApiProperty({ example: 90, required: false })
  @IsOptional()
  @IsInt()
  time_estimate_seconds?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
