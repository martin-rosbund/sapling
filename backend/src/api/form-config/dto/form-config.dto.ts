import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import type { SaplingFormConfigPayload } from '../../../entity/SaplingFormConfigItem';
import { EntityTemplateDto } from '../../template/dto/entity-template.dto';

export class SaveSaplingFormConfigDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ enum: ['global', 'role', 'person'] })
  @IsOptional()
  @IsIn(['global', 'role', 'person'])
  scope?: 'global' | 'role' | 'person';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scopeHandle?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({ type: Object })
  @IsObject()
  config!: SaplingFormConfigPayload;
}

export class SaplingFormConfigValidationIssueDto {
  @ApiProperty()
  path!: string;

  @ApiProperty()
  message!: string;
}

export class SaplingFormConfigValidationResultDto {
  @ApiProperty()
  isValid!: boolean;

  @ApiProperty({ type: () => SaplingFormConfigValidationIssueDto, isArray: true })
  errors!: SaplingFormConfigValidationIssueDto[];

  @ApiProperty({ type: () => SaplingFormConfigValidationIssueDto, isArray: true })
  warnings!: SaplingFormConfigValidationIssueDto[];

  @ApiProperty({ type: Object })
  normalizedConfig!: SaplingFormConfigPayload;
}

export class EffectiveSaplingFormTemplateDto {
  @ApiProperty()
  entityHandle!: string;

  @ApiProperty({ type: () => EntityTemplateDto, isArray: true })
  entityTemplates!: EntityTemplateDto[];
}
