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

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export class MailSenderOptionDto {
  @ApiProperty({ description: 'Sender email address that can be selected.' })
  email!: string;

  @ApiPropertyOptional({
    description: 'Optional human-readable display name for the sender.',
  })
  displayName?: string;

  @ApiProperty({ description: 'Technical identifier of the mail provider.' })
  provider!: string;

  @ApiProperty({
    description: 'Origin of the sender option, for example configuration or provider discovery.',
  })
  source!: string;

  @ApiProperty({
    description: 'Indicates whether this sender should be preselected by default.',
  })
  isDefault!: boolean;
}

export class MailSenderListResponseDto {
  @ApiPropertyOptional({
    description: 'Active provider for which sender options were resolved.',
  })
  provider?: string;

  @ApiProperty({
    type: [MailSenderOptionDto],
    description: 'Sender options that the user may choose from.',
  })
  senders!: MailSenderOptionDto[];
}

export class MailPreviewDto {
  @ApiProperty({
    description: 'Entity handle used to resolve template data and permissions.',
  })
  @IsString()
  @IsNotEmpty()
  entityHandle!: string;

  @ApiPropertyOptional({
    description: 'Optional record handle that provides the entity context for the email.',
  })
  @IsOptional()
  itemHandle?: string | number;

  @ApiPropertyOptional({
    description: 'Optional mail template handle that should be used to render the message.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  templateHandle?: number;

  @ApiPropertyOptional({
    description: 'Optional subject override applied after template resolution.',
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({
    description: 'Optional Markdown body override applied after template resolution.',
  })
  @IsOptional()
  @IsString()
  bodyMarkdown?: string;

  @ApiPropertyOptional({
    description: 'Optional sender email address that should be used for the message.',
  })
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsString()
  senderEmail?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Optional primary recipient list.',
  })
  @IsOptional()
  @Transform(({ value }) => normalizeStringArray(value))
  @IsArray()
  @IsString({ each: true })
  to?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Optional carbon-copy recipient list.',
  })
  @IsOptional()
  @Transform(({ value }) => normalizeStringArray(value))
  @IsArray()
  @IsString({ each: true })
  cc?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Optional blind-carbon-copy recipient list.',
  })
  @IsOptional()
  @Transform(({ value }) => normalizeStringArray(value))
  @IsArray()
  @IsString({ each: true })
  bcc?: string[];

  @ApiPropertyOptional({
    type: Object,
    description: 'Optional ad-hoc values that should be available during template rendering.',
  })
  @IsOptional()
  @IsObject()
  draftValues?: Record<string, unknown>;

  @ApiPropertyOptional({
    type: [Number],
    description: 'Optional list of document handles that should be attached to the message.',
  })
  @IsOptional()
  @Transform(({ value }) => normalizeNumberArray(value))
  @IsArray()
  @IsInt({ each: true })
  attachmentHandles?: number[];
}

export class MailSendDto extends MailPreviewDto {}

export class MailPreviewResponseDto {
  @ApiProperty({
    description: 'Entity handle that was used to resolve the preview.',
  })
  entityHandle!: string;

  @ApiPropertyOptional({
    description: 'Record handle that was used as the entity context, when provided.',
  })
  itemHandle?: string | number;

  @ApiPropertyOptional({
    description: 'Mail template handle that contributed to the rendered preview, when applicable.',
  })
  templateHandle?: number;

  @ApiProperty({
    type: [String],
    description: 'Resolved primary recipient list.',
  })
  to!: string[];

  @ApiProperty({
    type: [String],
    description: 'Resolved carbon-copy recipient list.',
  })
  cc!: string[];

  @ApiProperty({
    type: [String],
    description: 'Resolved blind-carbon-copy recipient list.',
  })
  bcc!: string[];

  @ApiProperty({ description: 'Resolved email subject line.' })
  subject!: string;

  @ApiProperty({ description: 'Resolved Markdown body.' })
  bodyMarkdown!: string;

  @ApiProperty({ description: 'Resolved HTML body ready for rendering.' })
  bodyHtml!: string;

  @ApiPropertyOptional({
    description: 'Resolved sender email address, when one could be determined.',
  })
  senderEmail?: string;

  @ApiPropertyOptional({
    type: [Number],
    description: 'Attachment document handles that are part of the preview.',
  })
  attachmentHandles?: number[];
}
