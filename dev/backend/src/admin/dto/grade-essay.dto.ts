import { IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GradeEssayDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  rubric_scores?: string; // JSON string of rubric scores
}
