import { ApiProperty } from '@nestjs/swagger';
import { EntityItem } from '../../../entity/EntityItem';
import { EntityTemplateDto } from '../../template/dto/entity-template.dto';
import { AccumulatedPermissionDto } from './accumulated-permission.dto';

export class CurrentEntityMetadataDto {
  @ApiProperty({
    description: 'Requested Sapling entity handle.',
    example: 'ticket',
  })
  entityHandle!: string;

  @ApiProperty({
    description: 'Persisted entity definition for the requested handle.',
    type: () => EntityItem,
    nullable: true,
  })
  entity!: EntityItem | null;

  @ApiProperty({
    description:
      'Resolved permissions for the authenticated user on the requested entity.',
    type: () => AccumulatedPermissionDto,
  })
  entityPermission!: AccumulatedPermissionDto;

  @ApiProperty({
    description:
      'Template metadata describing fields, relations, and generated form hints for the entity.',
    type: () => EntityTemplateDto,
    isArray: true,
  })
  entityTemplates!: EntityTemplateDto[];
}
