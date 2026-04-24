import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class VectorizeEntityDto {
  @ApiProperty({
    description:
      'Registered Sapling entity handle that should be vectorized. Currently supported: ticket.',
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
  @ApiProperty()
  entityHandle!: string;

  @ApiProperty()
  providerHandle!: string;

  @ApiProperty()
  modelHandle!: string;

  @ApiProperty()
  totalSourceRecords!: number;

  @ApiProperty()
  totalDocuments!: number;

  @ApiProperty()
  embeddedDocuments!: number;

  @ApiProperty()
  skippedDocuments!: number;

  @ApiProperty()
  deletedDocuments!: number;
}
