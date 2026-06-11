import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AiChatMessageItem } from '../../../entity/AiChatMessageItem';

export class CreateAiChatSessionDto {
  @ApiPropertyOptional({
    description: 'Optional title for the new chat session',
  })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  title?: string;

  @ApiPropertyOptional({
    description: 'Preferred AI provider handle for this chat session',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  providerHandle?: string;

  @ApiPropertyOptional({
    description: 'Preferred AI model handle for this chat session',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  modelHandle?: string;

  @ApiPropertyOptional({
    description: 'Optional AI agent handle for this chat session',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  agentHandle?: string;

  @ApiPropertyOptional({
    description: 'Optional fixed agent version handle for this chat session',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  agentVersionHandle?: number;

  @ApiPropertyOptional({
    description: 'Optional agent playbook handle for this chat session',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  playbookHandle?: string;

  @ApiPropertyOptional({
    description: 'Optional context entity handle for the chat session',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  contextEntityHandle?: string;

  @ApiPropertyOptional({
    description: 'Optional context record handle for the chat session',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  contextRecordHandle?: string;
}

export class UpdateAiChatSessionDto {
  @ApiPropertyOptional({
    description: 'Updated display title of the chat session',
  })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  title?: string;

  @ApiPropertyOptional({ description: 'Archive state of the chat session' })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @ApiPropertyOptional({
    description: 'Preferred AI provider handle for this chat session',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  providerHandle?: string;

  @ApiPropertyOptional({
    description: 'Preferred AI model handle for this chat session',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  modelHandle?: string;

  @ApiPropertyOptional({
    description: 'Optional AI agent handle for this chat session',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  agentHandle?: string;

  @ApiPropertyOptional({
    description: 'Optional fixed agent version handle for this chat session',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  agentVersionHandle?: number;

  @ApiPropertyOptional({
    description: 'Optional agent playbook handle for this chat session',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  playbookHandle?: string;

  @ApiPropertyOptional({
    description: 'Optional context entity handle for this chat session',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  contextEntityHandle?: string;

  @ApiPropertyOptional({
    description: 'Optional context record handle for this chat session',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  contextRecordHandle?: string;
}

export class CreateAiChatMessageDto {
  @ApiPropertyOptional({
    description:
      'Existing session handle. If omitted, a new session is created.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sessionHandle?: number;

  @ApiPropertyOptional({
    description:
      'Optional initial session title used when a new session is created.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  sessionTitle?: string;

  @ApiProperty({ description: 'Message content entered by the user' })
  @IsString()
  @MaxLength(16384)
  content!: string;

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
    description: 'Optional preferred AI provider handle for this message',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  providerHandle?: string;

  @ApiPropertyOptional({
    description: 'Optional preferred AI model handle for this message',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  modelHandle?: string;

  @ApiPropertyOptional({
    description: 'Optional AI agent handle for this message/session',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  agentHandle?: string;

  @ApiPropertyOptional({
    description: 'Optional fixed agent version handle for this message/session',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  agentVersionHandle?: number;

  @ApiPropertyOptional({
    description: 'Optional playbook handle for this message/session',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  playbookHandle?: string;

  @ApiPropertyOptional({
    description: 'Optional context entity handle for this message/session',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  contextEntityHandle?: string;

  @ApiPropertyOptional({
    description: 'Optional context record handle for this message/session',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  contextRecordHandle?: string;

  @ApiPropertyOptional({
    description: 'Optional transcription handle linked to this message',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  transcriptionHandle?: number;

  @ApiPropertyOptional({
    description: 'Optional structured context payload from the frontend',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  contextPayload?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Current client date/time at request time as an ISO timestamp',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientCurrentDateTime?: string;

  @ApiPropertyOptional({
    description:
      'IANA timezone reported by the client, for example Europe/Berlin or America/New_York',
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
    description:
      'Client offset from UTC in minutes at request time, for example 120 for UTC+02:00',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  clientUtcOffsetMinutes?: number;
}

export class CreateAiChatMessageSpeechDto {
  @ApiPropertyOptional({
    description: 'Optional preferred AI provider handle for speech output',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  providerHandle?: string;

  @ApiPropertyOptional({
    description: 'Optional preferred AI model handle for speech output',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  modelHandle?: string;
}

export class ListAiChatMessagesQueryDto {
  @ApiPropertyOptional({
    description: 'Maximum number of messages to return in a single page',
    default: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 100;

  @ApiPropertyOptional({
    description:
      'Load messages with a sequence number smaller than this value to fetch older pages',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  beforeSequence?: number;
}

export class AiChatMessageListMetaDto {
  @ApiProperty({
    description: 'Maximum number of messages requested for the current page.',
  })
  limit!: number;

  @ApiProperty({
    description: 'Indicates whether older messages are still available.',
  })
  hasMore!: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Cursor value that can be sent as beforeSequence to load the next older page.',
  })
  nextBeforeSequence!: number | null;
}

export class AiChatMessageListResponseDto {
  @ApiProperty({
    type: AiChatMessageItem,
    isArray: true,
    description: 'Persisted chat messages for the requested session page.',
  })
  data: AiChatMessageItem[] = [];

  @ApiProperty({
    type: AiChatMessageListMetaDto,
    description: 'Pagination metadata for requesting older messages.',
  })
  meta: AiChatMessageListMetaDto = new AiChatMessageListMetaDto();
}

export class CreateAiAgentTestRunDto {
  @ApiProperty({
    description: 'Prompt that should be tested against the agent',
  })
  @IsString()
  @MaxLength(16384)
  prompt!: string;

  @ApiPropertyOptional({ description: 'Optional agent version to test' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  agentVersionHandle?: number;

  @ApiPropertyOptional({
    description: 'Optional playbook handle for the test run',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  playbookHandle?: string;

  @ApiPropertyOptional({ description: 'Optional context entity handle' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  contextEntityHandle?: string;

  @ApiPropertyOptional({ description: 'Optional context record handle' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  contextRecordHandle?: string;
}

export class CreateAiAgentEvaluationDto {
  @ApiProperty()
  @IsString()
  @MaxLength(160)
  title!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(16384)
  prompt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  expectedCriteria?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  agentVersionHandle?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  targetEntityHandle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  targetRecordHandle?: string;
}

export class ApplyAiChatSessionPlaybookDto {
  @ApiProperty({ description: 'Playbook handle to apply to the chat session' })
  @IsString()
  @MaxLength(64)
  playbookHandle!: string;
}
