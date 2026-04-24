import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TicketVectorizeRequestDto {
  @ApiPropertyOptional()
  entityHandle?: string;

  @ApiPropertyOptional()
  providerHandle?: string;

  @ApiPropertyOptional()
  modelHandle?: string;

  @ApiPropertyOptional()
  batchSize?: number;

  @ApiPropertyOptional()
  limit?: number;

  @ApiPropertyOptional()
  force?: boolean;

  @ApiPropertyOptional()
  includeEmbeddings?: boolean;
}

export class TicketVectorizeResponseDto {
  @ApiProperty()
  processed!: number;

  @ApiProperty()
  created!: number;

  @ApiProperty()
  updated!: number;

  @ApiProperty()
  skipped!: number;

  @ApiProperty()
  entityHandle!: string;

  @ApiPropertyOptional()
  providerHandle?: string | null;

  @ApiPropertyOptional()
  modelHandle?: string | null;

  @ApiPropertyOptional()
  model?: string | null;

  @ApiProperty()
  includeEmbeddings!: boolean;
}