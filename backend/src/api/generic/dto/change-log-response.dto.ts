import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ChangeLogPersonDto {
  @ApiProperty()
  handle!: string | number;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiPropertyOptional()
  email?: string;
}

class ChangeLogEntityDto {
  @ApiProperty()
  handle!: string;

  @ApiPropertyOptional()
  icon?: string | null;
}

export class ChangeLogDetailResponseDto {
  @ApiProperty()
  property!: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  oldValue?: unknown;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  newValue?: unknown;
}

export class ChangeLogResponseDto {
  @ApiProperty()
  handle!: number;

  @ApiProperty({ enum: ['create', 'update', 'delete'] })
  action!: 'create' | 'update' | 'delete';

  @ApiProperty()
  reference!: string;

  @ApiProperty({ type: () => ChangeLogEntityDto })
  entity!: ChangeLogEntityDto;

  @ApiProperty({ type: () => ChangeLogPersonDto })
  person!: ChangeLogPersonDto;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  oldPayload?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  newPayload?: Record<string, unknown> | null;

  @ApiProperty({ type: () => ChangeLogDetailResponseDto, isArray: true })
  details: ChangeLogDetailResponseDto[] = [];

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt!: Date;
}
