import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from './pagination-meta.dto';

// Response DTO for paginated entity lists
export class PaginatedResponseDto {
  @ApiProperty({
    type: [Object],
    description: 'Die Liste der zurückgegebenen Entitäten', // The list of returned entities
  })
  data: object[];

  @ApiProperty({ type: () => PaginationMetaDto })
  meta: PaginationMetaDto;
}
