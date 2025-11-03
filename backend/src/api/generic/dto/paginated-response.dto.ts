import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from './pagination-meta.dto';
import { ENTITY_REGISTRY } from 'src/entity/global/entity.registry';

// Response DTO for paginated entity lists
export class PaginatedResponseDto {
  /**
   * List of entities, each item is one of the registered entity types.
   *
   * Possible types: "company", "contract", "dashboard", ... (see ENTITY_NAMES)
   */
  @ApiProperty({
    type: 'array',
    items: {
      oneOf: ENTITY_REGISTRY.map((entry: { class: { name: string } }) => ({
        $ref: `#/components/schemas/${entry.class.name}`,
      })),
    },
    description: `The list of returned entities. Each item is one of: ${ENTITY_REGISTRY.map((e: { class: { name: string } }) => e.class.name).join(', ')}`,
    example: [],
  })
  data: any[];

  @ApiProperty({ type: () => PaginationMetaDto })
  meta: PaginationMetaDto;
}
