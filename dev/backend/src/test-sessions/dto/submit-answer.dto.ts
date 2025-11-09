import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitAnswerDto {
  @ApiProperty({ example: 'question_cuid_123' })
  @IsString()
  question_id: string;

  @ApiProperty({ 
    example: { answer: 'B' },
    description: 'Answer format depends on question type' 
  })
  user_answer: any;

  @ApiProperty({ example: 45, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  time_spent_seconds?: number;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  is_flagged?: boolean;
}
