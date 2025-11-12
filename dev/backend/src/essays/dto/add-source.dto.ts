import { IsInt, IsOptional, IsString } from 'class-validator';

export class AddSourceDto {
  @IsString()
  title: string;

  @IsOptional()
  authors?: any;

  @IsOptional()
  @IsString()
  venue?: string;

  @IsOptional()
  @IsInt()
  year?: number;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  kind?: string;

  @IsOptional()
  credibility?: number;

  @IsOptional()
  abstract?: string;

  @IsOptional()
  citation?: any;
}
