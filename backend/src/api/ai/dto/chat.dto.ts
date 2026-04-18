import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAiChatSessionDto {
  @ApiPropertyOptional({ description: 'Optional title for the new chat session' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  title?: string;

  @ApiPropertyOptional({ description: 'Preferred AI provider handle for this chat session' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  providerHandle?: string;

  @ApiPropertyOptional({ description: 'Preferred AI model handle for this chat session' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  modelHandle?: string;
}

export class UpdateAiChatSessionDto {
  @ApiPropertyOptional({ description: 'Updated display title of the chat session' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  title?: string;

  @ApiPropertyOptional({ description: 'Archive state of the chat session' })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @ApiPropertyOptional({ description: 'Preferred AI provider handle for this chat session' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  providerHandle?: string;

  @ApiPropertyOptional({ description: 'Preferred AI model handle for this chat session' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  modelHandle?: string;
}

export class CreateAiChatMessageDto {
  @ApiPropertyOptional({ description: 'Existing session handle. If omitted, a new session is created.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sessionHandle?: number;

  @ApiPropertyOptional({ description: 'Optional initial session title used when a new session is created.' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  sessionTitle?: string;

  @ApiProperty({ description: 'Message content entered by the user' })
  @IsString()
  @MaxLength(16384)
  content!: string;

  @ApiPropertyOptional({ description: 'Optional route name of the current frontend page' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  routeName?: string;

  @ApiPropertyOptional({ description: 'Optional full page URL of the current frontend page' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  url?: string;

  @ApiPropertyOptional({ description: 'Optional page title of the current frontend page' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  pageTitle?: string;

  @ApiPropertyOptional({ description: 'Optional preferred AI provider handle for this message' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  providerHandle?: string;

  @ApiPropertyOptional({ description: 'Optional preferred AI model handle for this message' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  modelHandle?: string;

  @ApiPropertyOptional({
    description: 'Optional structured context payload from the frontend',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  contextPayload?: Record<string, unknown>;
}