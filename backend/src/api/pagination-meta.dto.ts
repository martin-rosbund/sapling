import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ example: 10, description: 'Gesamtzahl der Einträge' })
  total: number;

  @ApiProperty({ example: 1, description: 'Aktuelle Seite' })
  page: number;

  @ApiProperty({ example: 10, description: 'Einträge pro Seite' })
  limit: number;

  @ApiProperty({ example: 1, description: 'Gesamtzahl der Seiten' })
  totalPages: number;
}
