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
      // Wandelt den JSON-String in ein Objekt um
      return JSON.parse(value);
    } catch (e) {
      return {}; // oder wirf einen BadRequestException
    }
  })
  filter: object = {};
}