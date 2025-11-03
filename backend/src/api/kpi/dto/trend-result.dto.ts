import { ApiProperty } from '@nestjs/swagger';

export class TrendResultDto {
  @ApiProperty({
    description: 'Aktueller Wert',
    type: 'number',
    nullable: true,
    oneOf: [{ type: 'number' }, { type: 'object' }],
  })
  current: number | object | null;

  @ApiProperty({
    description: 'Vorheriger Wert',
    type: 'number',
    nullable: true,
    oneOf: [{ type: 'number' }, { type: 'object' }],
  })
  previous: number | object | null;

  constructor(
    current: number | object | null,
    previous: number | object | null,
  ) {
    this.current = current;
    this.previous = previous;
  }
}
