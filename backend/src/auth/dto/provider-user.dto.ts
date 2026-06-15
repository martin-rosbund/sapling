import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export type ProviderUserProvider = 'azure' | 'google';
export type ProviderUserImportAction =
  | 'created'
  | 'updated'
  | 'skipped'
  | 'failed';

export class ProviderUserDto {
  @ApiProperty({ enum: ['azure', 'google'] })
  provider!: ProviderUserProvider;

  @ApiProperty()
  id!: string;

  @ApiProperty()
  displayName!: string;

  @ApiPropertyOptional()
  firstName?: string | null;

  @ApiPropertyOptional()
  lastName?: string | null;

  @ApiPropertyOptional()
  email?: string | null;

  @ApiPropertyOptional()
  userPrincipalName?: string | null;

  @ApiPropertyOptional()
  existingPersonHandle?: number | null;
}

export class ProviderUserListResponseDto {
  @ApiProperty({ type: ProviderUserDto, isArray: true })
  users!: ProviderUserDto[];

  @ApiPropertyOptional()
  nextPageToken?: string | null;
}

export class ImportProviderUsersDto {
  @ApiProperty({ enum: ['azure', 'google'] })
  @IsIn(['azure', 'google'])
  provider!: ProviderUserProvider;

  @ApiProperty({ type: String, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  userIds!: string[];

  @ApiProperty({ type: Number, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  @Min(1, { each: true })
  roleHandles!: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  companyHandle?: number;
}

export class ProviderUserImportRowDto {
  @ApiProperty()
  providerUserId!: string;

  @ApiProperty({ enum: ['created', 'updated', 'skipped', 'failed'] })
  action!: ProviderUserImportAction;

  @ApiPropertyOptional()
  personHandle?: number | null;

  @ApiPropertyOptional()
  displayName?: string | null;

  @ApiPropertyOptional()
  email?: string | null;

  @ApiPropertyOptional()
  message?: string | null;
}

export class ProviderUserImportResponseDto {
  @ApiProperty()
  created!: number;

  @ApiProperty()
  updated!: number;

  @ApiProperty()
  skipped!: number;

  @ApiProperty()
  failed!: number;

  @ApiProperty({ type: ProviderUserImportRowDto, isArray: true })
  rows!: ProviderUserImportRowDto[];
}

export class ListProviderUsersQueryDto {
  @ApiProperty({ enum: ['azure', 'google'] })
  @IsIn(['azure', 'google'])
  provider!: ProviderUserProvider;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pageToken?: string;
}
