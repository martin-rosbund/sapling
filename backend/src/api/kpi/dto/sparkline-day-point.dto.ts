import { ApiProperty } from '@nestjs/swagger';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         DTO representing a single sparkline data point for a day, including properties for day, month, year, and value.
 *
 * @property        {number} day      Day of the month (numeric)
 * @property        {number} month    Month of the year (numeric)
 * @property        {number} year     Year (numeric)
 * @property        {number|object|null} value Value for the sparkline point (can be number, object, or null)
 */
export class SparklineDayPointDto {
  /**
   * Day of the month (numeric).
   * @type {number}
   */
  @ApiProperty({ description: 'Day', type: 'number' })
  day: number;

  /**
   * Month of the year (numeric).
   * @type {number}
   */
  @ApiProperty({ description: 'Month', type: 'number' })
  month: number;

  /**
   * Year (numeric).
   * @type {number}
   */
  @ApiProperty({ description: 'Year', type: 'number' })
  year: number;

  /**
   * Value for the sparkline point (can be number, object, or null).
   * @type {number|object|null}
   */
  @ApiProperty({
    description: 'Value',
    type: 'number',
    nullable: true,
    oneOf: [{ type: 'number' }, { type: 'object' }],
  })
  value: number | object | null;

  /**
   * Constructor to initialize a sparkline day point.
   * @param day Day of the month
   * @param month Month of the year
   * @param year Year
   * @param value Value for the sparkline point
   */
  constructor(
    day: number,
    month: number,
    year: number,
    value: number | object | null,
  ) {
    this.day = day;
    this.month = month;
    this.year = year;
    this.value = value;
  }
}
