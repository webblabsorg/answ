import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  IsDateString,
  IsArray,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { HomeworkType } from '@prisma/client';

export class CreateHomeworkDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  class_id?: string;

  @IsString()
  subject: string;

  @IsEnum(HomeworkType)
  homework_type: HomeworkType;

  @IsDateString()
  due_date: string;

  @IsDateString()
  @IsOptional()
  lock_date?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  points?: number;

  @IsBoolean()
  @IsOptional()
  allow_late?: boolean;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  late_penalty?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  max_attempts?: number;

  @IsBoolean()
  @IsOptional()
  show_correct?: boolean;

  // Group assignment settings (Phase 3)
  @IsBoolean()
  @IsOptional()
  is_group_assignment?: boolean;

  @IsInt()
  @Min(2)
  @IsOptional()
  group_size_min?: number;

  @IsInt()
  @Min(2)
  @IsOptional()
  group_size_max?: number;

  @IsBoolean()
  @IsOptional()
  allow_group_choice?: boolean;

  // Peer review settings (Phase 3)
  @IsBoolean()
  @IsOptional()
  requires_peer_review?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  peer_review_count?: number;

  @IsDateString()
  @IsOptional()
  peer_review_due_date?: string;

  // AI settings
  @IsBoolean()
  @IsOptional()
  ai_assistance?: boolean;

  @IsBoolean()
  @IsOptional()
  plagiarism_check?: boolean;

  @IsBoolean()
  @IsOptional()
  ai_grading?: boolean;

  // Content
  @IsOptional()
  attachments?: any;

  @IsOptional()
  rubric?: any;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  objectives?: string[];
}
