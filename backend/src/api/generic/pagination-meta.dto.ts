import { ApiProperty } from '@nestjs/swagger';

// Metadata for pagination
export class PaginationMetaDto {
  @ApiProperty({ example: 10, description: 'Gesamtzahl der Einträge' }) // Total number of entries
  total: number;

  @ApiProperty({ example: 1, description: 'Aktuelle Seite' }) // Current page
  page: number;

  @ApiProperty({ example: 10, description: 'Einträge pro Seite' }) // Entries per page
  limit: number;

  @ApiProperty({ example: 1, description: 'Gesamtzahl der Seiten' }) // Total number of pages
  totalPages: number;
}
