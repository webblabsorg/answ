import { IsOptional, IsString } from 'class-validator';

export class SearchDto {
  @IsString()
  q: string;

  @IsOptional()
  @IsString()
  filter?: string; // additional filters passed through to providers
}
