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
