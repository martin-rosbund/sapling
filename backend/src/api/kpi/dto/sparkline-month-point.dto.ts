import { ApiProperty } from '@nestjs/swagger';

export class SparklineMonthPointDto {
  @ApiProperty({ description: 'Monat', type: 'number' })
  month: number;

  @ApiProperty({ description: 'Jahr', type: 'number' })
  year: number;

  @ApiProperty({ description: 'Wert', type: 'number', nullable: true, oneOf: [{ type: 'number' }, { type: 'object' }] })
  value: number | object | null;

  constructor(month: number, year: number, value: number | object | null) {
    this.month = month;
    this.year = year;
    this.value = value;
  }
}
