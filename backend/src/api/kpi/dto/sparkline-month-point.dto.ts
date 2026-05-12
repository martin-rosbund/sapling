import { ApiProperty } from '@nestjs/swagger';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         DTO representing a single sparkline data point for a month, including properties for month, year, and value.
 *
 * @property        {number} month     Month of the year (numeric)
 * @property        {number} year      Year (numeric)
 * @property        {number|object|null} value Value for the sparkline point (can be number, object, or null)
 */
export class SparklineMonthPointDto {
  /**
   * Month of the year (numeric).
   * @type {number}
   */
  @ApiProperty({
    description: 'Calendar month of the sparkline point.',
    type: 'number',
  })
  month: number;

  /**
   * Year (numeric).
   * @type {number}
   */
  @ApiProperty({
    description: 'Calendar year of the sparkline point.',
    type: 'number',
  })
  year: number;

  /**
   * Value for the sparkline point (can be number, object, or null).
   * @type {number|object|null}
   */
  @ApiProperty({
    description:
      'KPI value recorded for this month. This can be numeric, structured, or null.',
    type: 'number',
    nullable: true,
    oneOf: [
      { type: 'number', description: 'Single numeric point value.' },
      {
        type: 'object',
        description: 'Structured point value for grouped or composite metrics.',
      },
      { type: 'null', description: 'No value is available for this month.' },
    ],
  })
  value: number | object | null;

  /**
   * Constructor to initialize a sparkline month point.
   * @param month Month of the year
   * @param year Year
   * @param value Value for the sparkline point
   */
  constructor(month: number, year: number, value: number | object | null) {
    this.month = month;
    this.year = year;
    this.value = value;
  }
}
