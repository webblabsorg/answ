import { IsString, IsInt, IsOptional, Min, Max } from 'class-validator';

export class CreatePeerReviewDto {
  @IsString()
  homework_id: string;

  @IsString()
  submission_id: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsString()
  @IsOptional()
  feedback?: string;

  @IsOptional()
  rubric_scores?: any;

  @IsString()
  @IsOptional()
  strengths?: string;

  @IsString()
  @IsOptional()
  improvements?: string;
}

export class AssignPeerReviewsDto {
  @IsString()
  homework_id: string;

  @IsInt()
  @Min(1)
  reviews_per_student: number;
}
