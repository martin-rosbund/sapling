import { Type, Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class PaginatedQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  limit: number = 100;

  @IsOptional()
  @Transform(({ value }) => {
    try {
      return typeof value === 'string' ? (JSON.parse(value) as object) : {};
    } catch {
      return {};
    }
  })
  filter: object = {};

  @IsOptional()
  @Transform(({ value }) => {
    try {
      return typeof value === 'string' ? (JSON.parse(value) as object) : {};
    } catch {
      return {};
    }
  })
  orderBy: object = {};
}
