import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from './pagination-meta.dto';

export class PaginatedResponseDto {
  @ApiProperty({
    type: [Object],
    description: 'Die Liste der zurückgegebenen Entitäten',
  })
  data: object[];

  @ApiProperty({ type: () => PaginationMetaDto })
  meta: PaginationMetaDto;
}
