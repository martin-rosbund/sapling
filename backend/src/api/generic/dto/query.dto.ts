import { BadRequestException } from '@nestjs/common';
import { Type, Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

function parseJsonObjectQuery(
  value: unknown,
  fieldName: string,
): Record<string, unknown> {
  if (typeof value !== 'string') {
    return {};
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return {};
  }

  try {
    const parsedValue = JSON.parse(trimmedValue) as unknown;

    if (
      parsedValue == null ||
      typeof parsedValue !== 'object' ||
      Array.isArray(parsedValue)
    ) {
      throw new BadRequestException(
        'exception.badRequest',
        `${fieldName} must be a JSON object`,
      );
    }

    return parsedValue as Record<string, unknown>;
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }

    throw new BadRequestException(
      'exception.badRequest',
      `Invalid ${fieldName} JSON`,
    );
  }
}

function parseStringArrayQuery(value: unknown, fieldName: string): string[] {
  if (typeof value !== 'string') {
    return [];
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return [];
  }

  if (trimmedValue.startsWith('[')) {
    try {
      const parsedValue = JSON.parse(trimmedValue) as unknown;

      if (
        !Array.isArray(parsedValue) ||
        !parsedValue.every((item) => typeof item === 'string')
      ) {
        throw new BadRequestException(
          'exception.badRequest',
          `${fieldName} must be a JSON array of strings`,
        );
      }

      return parsedValue;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        'exception.badRequest',
        `Invalid ${fieldName} JSON`,
      );
    }
  }

  return trimmedValue
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

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
  @Transform(({ value }) => parseStringArrayQuery(value, 'relations'))
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
  @Transform(({ value }) => parseJsonObjectQuery(value, 'filter'))
  filter: object = {}; // filter conditions

  @IsOptional()
  @Transform(({ value }) => parseStringArrayQuery(value, 'relations'))
  relations: string[] = []; // relations to load

  @IsOptional()
  @Transform(({ value }) => parseJsonObjectQuery(value, 'orderBy'))
  orderBy: object = {}; // ordering
}
