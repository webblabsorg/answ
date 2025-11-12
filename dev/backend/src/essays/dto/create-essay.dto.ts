import { IsOptional, IsString } from 'class-validator';

export class CreateEssayDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  subject?: string;
}
