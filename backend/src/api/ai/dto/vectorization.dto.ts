import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class VectorizeEntityDto {
  @ApiProperty({
    description:
      'Registered Sapling entity handle that should be vectorized. Supported: ticket, event, salesOpportunity, effortEstimate, effortEstimatePosition, knowledgeArticle.',
  })
  @IsString()
  @MaxLength(64)
  entityHandle!: string;

  @ApiProperty({
    description: 'AI provider handle used for embedding generation.',
  })
  @IsString()
  @MaxLength(64)
  providerHandle!: string;

  @ApiProperty({
    description: 'AI model handle used for embedding generation.',
  })
  @IsString()
  @MaxLength(128)
  modelHandle!: string;
}

export class VectorizeEntityResponseDto {
  @ApiProperty({
    description:
      'Entity handle that was processed during the vectorization run.',
  })
  entityHandle!: string;

  @ApiProperty({
    description: 'Embedding provider handle used for the run.',
  })
  providerHandle!: string;

  @ApiProperty({
    description: 'Embedding model handle used for the run.',
  })
  modelHandle!: string;

  @ApiProperty({
    description: 'Total number of source records evaluated for vectorization.',
  })
  totalSourceRecords!: number;

  @ApiProperty({
    description: 'Total number of vector documents considered during the run.',
  })
  totalDocuments!: number;

  @ApiProperty({
    description: 'Number of vector documents that were created or updated.',
  })
  embeddedDocuments!: number;

  @ApiProperty({
    description:
      'Number of source documents skipped because no update was required.',
  })
  skippedDocuments!: number;

  @ApiProperty({
    description: 'Number of obsolete vector documents removed during cleanup.',
  })
  deletedDocuments!: number;
}
