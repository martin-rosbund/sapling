import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiTokenResponseDto {
  @ApiProperty()
  handle!: number;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  tokenPrefix!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: 'string', format: 'date-time' })
  expiresAt!: Date;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  lastUsedAt?: Date;

  @ApiPropertyOptional({ type: [String] })
  allowedIps?: string[];

  @ApiProperty()
  personHandle!: number;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: 'string', format: 'date-time' })
  updatedAt!: Date;
}

export class ApiTokenSecretResponseDto {
  @ApiProperty({ type: () => ApiTokenResponseDto })
  token!: ApiTokenResponseDto;

  @ApiProperty({
    description: 'The bearer token secret. This is only returned once.',
  })
  secret!: string;
}
