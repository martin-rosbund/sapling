import { Type, Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         DTO for update query parameters (only PK and relations).
 *
 * @property        {string[]} relations           Relations to load
 */
export class UpdateQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    try {
      return typeof value === 'string' ? (JSON.parse(value) as string[]) : [];
    } catch {
      return [];
    }
  })
  relations: string[] = []; // relations to load
}

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         DTO for paginated queries, including page, limit, filter, relations, and orderBy.
 *
 * @property        {number} page                  Page number
 * @property        {number} limit                 Entries per page
 * @property        {object} filter                Filter conditions
 * @property        {string[]} relations           Relations to load
 * @property        {object} orderBy               Ordering
 */
export class PaginatedQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1; // page

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 1000; // entries per page

  @IsOptional()
  @Transform(({ value }) => {
    try {
      return typeof value === 'string' ? (JSON.parse(value) as object) : {};
    } catch {
      return {};
    }
  })
  filter: object = {}; // filter conditions

  @IsOptional()
  @Transform(({ value }) => {
    try {
      return typeof value === 'string' ? (JSON.parse(value) as string[]) : [];
    } catch {
      return [];
    }
  })
  relations: string[] = []; // relations to load

  @IsOptional()
  @Transform(({ value }) => {
    try {
      return typeof value === 'string' ? (JSON.parse(value) as object) : {};
    } catch {
      return {};
    }
  })
  orderBy: object = {}; // ordering
}
