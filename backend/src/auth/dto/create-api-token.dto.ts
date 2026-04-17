import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateApiTokenDto {
  @ApiProperty({ description: 'Display name for the token' })
  @IsString()
  @MaxLength(128)
  description!: string;

  @ApiProperty({
    description: 'Expiration date for the token',
    type: 'string',
    format: 'date-time',
  })
  @Type(() => Date)
  @IsDate()
  expiresAt!: Date;

  @ApiPropertyOptional({
    description: 'Optional person handle for global token managers',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  personHandle?: number;

  @ApiPropertyOptional({
    description: 'Optional allow-list of client IP addresses',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(32)
  @IsString({ each: true })
  allowedIps?: string[];
}
