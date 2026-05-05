import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateAiChatTranscriptionDto {
  @ApiPropertyOptional({
    description: 'Optional existing chat session handle for contextual linkage',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sessionHandle?: number;

  @ApiPropertyOptional({
    description: 'Optional preferred AI provider handle for transcription',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  providerHandle?: string;

  @ApiPropertyOptional({
    description: 'Optional preferred AI transcription model handle',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  modelHandle?: string;

  @ApiPropertyOptional({
    description: 'Optional ISO-639-1 language hint for the input audio',
  })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  language?: string;

  @ApiPropertyOptional({
    description: 'Optional route name of the current frontend page',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  routeName?: string;

  @ApiPropertyOptional({
    description: 'Optional full page URL of the current frontend page',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  url?: string;

  @ApiPropertyOptional({
    description: 'Optional page title of the current frontend page',
  })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  pageTitle?: string;

  @ApiPropertyOptional({
    description: 'Current client date/time at request time as an ISO timestamp',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientCurrentDateTime?: string;

  @ApiPropertyOptional({
    description: 'IANA timezone reported by the client',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientTimeZone?: string;

  @ApiPropertyOptional({
    description: 'Locale reported by the client, for example de-DE or en-US',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientLocale?: string;

  @ApiPropertyOptional({
    description: 'Client offset from UTC in minutes at request time',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  clientUtcOffsetMinutes?: number;

  @ApiPropertyOptional({
    description:
      'Optional measured duration from the client recorder in seconds',
  })
  @IsOptional()
  @Type(() => Number)
  durationSeconds?: number;
}

export class AiChatTranscriptionResponseDto {
  @ApiProperty()
  transcriptionHandle!: number;

  @ApiPropertyOptional({ nullable: true })
  transcript!: string | null;

  @ApiPropertyOptional({ nullable: true })
  detectedLanguage!: string | null;

  @ApiPropertyOptional({ nullable: true })
  durationSeconds!: number | null;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional({ nullable: true })
  providerHandle!: string | null;

  @ApiPropertyOptional({ nullable: true })
  modelHandle!: string | null;

  @ApiPropertyOptional({ nullable: true })
  documentHandle!: number | null;
}
