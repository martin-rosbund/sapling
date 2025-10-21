import { Type, Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

// DTO for paginated queries
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
  limit: number = 100; // entries per page

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
      return typeof value === 'string' ? (JSON.parse(value) as object) : {};
    } catch {
      return {};
    }
  })
  orderBy: object = {}; // ordering
}
