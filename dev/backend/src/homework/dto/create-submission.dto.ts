import { IsString, IsOptional, IsArray, IsInt, Min } from 'class-validator';

export class CreateSubmissionDto {
  @IsString()
  homework_id: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsOptional()
  files?: any;

  @IsInt()
  @Min(0)
  @IsOptional()
  word_count?: number;

  @IsString()
  @IsOptional()
  group_id?: string;
}

export class UpdateSubmissionDto {
  @IsString()
  @IsOptional()
  content?: string;

  @IsOptional()
  files?: any;

  @IsInt()
  @Min(0)
  @IsOptional()
  word_count?: number;
}

export class GradeSubmissionDto {
  @IsInt()
  @Min(0)
  score: number;

  @IsInt()
  @Min(0)
  max_score: number;

  @IsOptional()
  rubric_scores?: any;

  @IsString()
  @IsOptional()
  feedback?: string;

  @IsString()
  @IsOptional()
  teacher_comments?: string;
}
