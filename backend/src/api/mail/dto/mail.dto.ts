import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

function normalizeStringArray(value: unknown): string[] | undefined {
  if (value == null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[;,]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return undefined;
}

function normalizeNumberArray(value: unknown): number[] | undefined {
  if (value == null) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .map((entry) => (typeof entry === 'number' ? entry : Number(entry)))
    .filter((entry) => Number.isInteger(entry));
}

export class MailPreviewDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  entityHandle!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value)
  itemHandle?: string | number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  templateHandle?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bodyMarkdown?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => normalizeStringArray(value))
  @IsArray()
  @IsString({ each: true })
  to?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => normalizeStringArray(value))
  @IsArray()
  @IsString({ each: true })
  cc?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => normalizeStringArray(value))
  @IsArray()
  @IsString({ each: true })
  bcc?: string[];

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  draftValues?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @Transform(({ value }) => normalizeNumberArray(value))
  @IsArray()
  @IsInt({ each: true })
  attachmentHandles?: number[];
}

export class MailSendDto extends MailPreviewDto {}

export class MailPreviewResponseDto {
  @ApiProperty()
  entityHandle!: string;

  @ApiPropertyOptional()
  itemHandle?: string | number;

  @ApiPropertyOptional()
  templateHandle?: number;

  @ApiProperty({ type: [String] })
  to!: string[];

  @ApiProperty({ type: [String] })
  cc!: string[];

  @ApiProperty({ type: [String] })
  bcc!: string[];

  @ApiProperty()
  subject!: string;

  @ApiProperty()
  bodyMarkdown!: string;

  @ApiProperty()
  bodyHtml!: string;

  @ApiPropertyOptional({ type: [Number] })
  attachmentHandles?: number[];
}