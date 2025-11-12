import { IsString, IsArray, IsOptional, IsEnum } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  homework_id: string;

  @IsString()
  name: string;

  @IsArray()
  @IsString({ each: true })
  member_ids: string[];
}

export class AddGroupMemberDto {
  @IsString()
  student_id: string;

  @IsEnum(['leader', 'member'])
  @IsOptional()
  role?: string;
}

export class UpdateContributionDto {
  @IsString()
  group_id: string;

  @IsString()
  student_id: string;

  @IsOptional()
  contribution_score?: number;
}
