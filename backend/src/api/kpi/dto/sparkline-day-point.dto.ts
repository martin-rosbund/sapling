import { ApiProperty } from '@nestjs/swagger';

export class SparklineDayPointDto {
  @ApiProperty({ description: 'Tag', type: 'number' })
  day: number;

  @ApiProperty({ description: 'Monat', type: 'number' })
  month: number;

  @ApiProperty({ description: 'Jahr', type: 'number' })
  year: number;

  @ApiProperty({ description: 'Wert', type: 'number', nullable: true, oneOf: [{ type: 'number' }, { type: 'object' }] })
  value: number | object | null;

  constructor(day: number, month: number, year: number, value: number | object | null) {
    this.day = day;
    this.month = month;
    this.year = year;
    this.value = value;
  }
}
