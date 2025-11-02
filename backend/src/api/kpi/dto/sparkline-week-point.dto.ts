import { ApiProperty } from '@nestjs/swagger';

export class SparklineWeekPointDto {
  @ApiProperty({ description: 'Woche', type: 'number' })
  week: number;

  @ApiProperty({ description: 'Monat', type: 'number' })
  month: number;

  @ApiProperty({ description: 'Jahr', type: 'number' })
  year: number;

  @ApiProperty({ description: 'Wert', type: 'number', nullable: true, oneOf: [{ type: 'number' }, { type: 'object' }] })
  value: number | object | null;

  constructor(week: number, month: number, year: number, value: number | object | null) {
    this.week = week;
    this.month = month;
    this.year = year;
    this.value = value;
  }
}
