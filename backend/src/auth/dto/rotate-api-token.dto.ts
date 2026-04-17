import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDate,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class RotateApiTokenDto {
  @ApiPropertyOptional({
    description: 'Optional new display name for the token',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  description?: string;

  @ApiPropertyOptional({
    description: 'Optional replacement expiration date',
    type: 'string',
    format: 'date-time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;

  @ApiPropertyOptional({
    description: 'Optional replacement allow-list of client IP addresses',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(32)
  @IsString({ each: true })
  allowedIps?: string[];
}
