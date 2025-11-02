import { ApiProperty } from '@nestjs/swagger';

// Metadata for pagination
export class PaginationMetaDto {
  @ApiProperty({ example: 10, description: 'Total number of entries' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page' })
  page: number;

  @ApiProperty({ example: 10, description: 'Entries per page' })
  limit: number;

  @ApiProperty({ example: 1, description: 'Total number of pages' })
  totalPages: number;
}
