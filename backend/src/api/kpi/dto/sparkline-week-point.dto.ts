import { ApiProperty } from '@nestjs/swagger';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         DTO representing a single sparkline data point for a week, including properties for week, month, year, and value.
 *
 * @property        {number} week      Week of the year (numeric)
 * @property        {number} month     Month of the year (numeric)
 * @property        {number} year      Year (numeric)
 * @property        {number|object|null} value Value for the sparkline point (can be number, object, or null)
 */
export class SparklineWeekPointDto {
  /**
   * Week of the year (numeric).
   * @type {number}
   */
  @ApiProperty({
    description: 'Calendar week of the sparkline point.',
    type: 'number',
  })
  week: number;

  /**
   * Month of the year (numeric).
   * @type {number}
   */
  @ApiProperty({
    description: 'Calendar month associated with the sparkline point.',
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
      'KPI value recorded for this week. This can be numeric, structured, or null.',
    type: 'number',
    nullable: true,
    oneOf: [
      { type: 'number', description: 'Single numeric point value.' },
      {
        type: 'object',
        description: 'Structured point value for grouped or composite metrics.',
      },
      { type: 'null', description: 'No value is available for this week.' },
    ],
  })
  value: number | object | null;

  /**
   * Constructor to initialize a sparkline week point.
   * @param week Week of the year
   * @param month Month of the year
   * @param year Year
   * @param value Value for the sparkline point
   */
  constructor(
    week: number,
    month: number,
    year: number,
    value: number | object | null,
  ) {
    this.week = week;
    this.month = month;
    this.year = year;
    this.value = value;
  }
}
