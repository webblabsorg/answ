import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  format?: string; // markdown | html | plain

  @IsOptional()
  @IsInt()
  @Min(0)
  word_count?: number;
}
