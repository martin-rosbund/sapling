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
    nullable: true,
    oneOf: [
      { type: 'number' },
      { type: 'object' },
      { type: 'array', items: { type: 'object', additionalProperties: true } },
      { type: 'null' },
    ],
  })
  current: number | object | Array<Record<string, unknown>> | null;

  /**
   * Previous value (can be number, object, or null).
   * @type {number|object|null}
   */
  @ApiProperty({
    description: 'Previous value',
    nullable: true,
    oneOf: [
      { type: 'number' },
      { type: 'object' },
      { type: 'array', items: { type: 'object', additionalProperties: true } },
      { type: 'null' },
    ],
  })
  previous: number | object | Array<Record<string, unknown>> | null;

  /**
   * Constructor to initialize a trend result.
   * @param current Current value
   * @param previous Previous value
   */
  constructor(
    current: number | object | Array<Record<string, unknown>> | null,
    previous: number | object | Array<Record<string, unknown>> | null,
  ) {
    this.current = current;
    this.previous = previous;
  }
}
