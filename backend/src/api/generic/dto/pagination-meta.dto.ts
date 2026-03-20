import { ApiProperty } from '@nestjs/swagger';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Metadata DTO for pagination, including total entries, page, limit, and total pages.
 *
 * @property        {number} total                Total number of entries
 * @property        {number} page                 Current page
 * @property        {number} limit                Entries per page
 * @property        {number} totalPages           Total number of pages
 */
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
