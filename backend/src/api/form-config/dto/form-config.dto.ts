import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { SaplingFormConfigPayload } from '../../../entity/SaplingFormConfigItem';
import { EntityTemplateDto } from '../../template/dto/entity-template.dto';

export class SaveSaplingFormConfigDto {
  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ enum: ['global', 'role', 'person'] })
  scope?: 'global' | 'role' | 'person';

  @ApiPropertyOptional()
  scopeHandle?: string | null;

  @ApiPropertyOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  isDefault?: boolean;

  @ApiProperty({ type: Object })
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
