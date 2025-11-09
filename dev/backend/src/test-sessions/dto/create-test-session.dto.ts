import { IsString, IsBoolean, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTestSessionDto {
  @ApiProperty({ example: 'exam_cuid_123' })
  @IsString()
  exam_id: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  is_practice_mode?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  is_adaptive?: boolean;

  @ApiProperty({ 
    example: 40, 
    required: false,
    description: 'Number of questions to include (if not full test)' 
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  question_count?: number;

  @ApiProperty({ 
    example: 'section_cuid_123',
    required: false,
    description: 'Specific section to test (if not full exam)' 
  })
  @IsOptional()
  @IsString()
  section_id?: string;
}
