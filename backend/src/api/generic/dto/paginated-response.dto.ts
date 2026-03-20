import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from './pagination-meta.dto';
import { ENTITY_REGISTRY } from '../../../entity/global/entity.registry';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Response DTO for paginated entity lists, including data array and pagination metadata.
 *
 * @property        {any[]} data                  List of entities, each item is one of the registered entity types
 * @property        {PaginationMetaDto} meta      Pagination metadata
 */
export class PaginatedResponseDto {
  /**
   * List of entities, each item is one of the registered entity types.
   *
   * Possible types: "company", "contract", "dashboard", ... (see ENTITY_HANDLES)
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
