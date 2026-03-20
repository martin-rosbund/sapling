import { ApiProperty } from '@nestjs/swagger';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         DTO representing a trend result, including current and previous values.
 *
 * @property        {number|object|null} current   Current value (can be number, object, or null)
 * @property        {number|object|null} previous  Previous value (can be number, object, or null)
 */
export class TrendResultDto {
  /**
   * Current value (can be number, object, or null).
   * @type {number|object|null}
   */
  @ApiProperty({
    description: 'Current value',
    type: 'number',
    nullable: true,
    oneOf: [{ type: 'number' }, { type: 'object' }],
  })
  current: number | object | null;

  /**
   * Previous value (can be number, object, or null).
   * @type {number|object|null}
   */
  @ApiProperty({
    description: 'Previous value',
    type: 'number',
    nullable: true,
    oneOf: [{ type: 'number' }, { type: 'object' }],
  })
  previous: number | object | null;

  /**
   * Constructor to initialize a trend result.
   * @param current Current value
   * @param previous Previous value
   */
  constructor(
    current: number | object | null,
    previous: number | object | null,
  ) {
    this.current = current;
    this.previous = previous;
  }
}
