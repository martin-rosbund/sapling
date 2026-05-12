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
    description:
      'Value for the current comparison period. This can be numeric, structured, grouped, or null.',
    nullable: true,
    oneOf: [
      { type: 'number', description: 'Single numeric KPI value.' },
      {
        type: 'object',
        description: 'Structured KPI result for the current period.',
      },
      {
        type: 'array',
        items: { type: 'object', additionalProperties: true },
        description: 'Grouped KPI rows for the current period.',
      },
      { type: 'null', description: 'No value is available for the current period.' },
    ],
  })
  current: number | object | Array<Record<string, unknown>> | null;

  /**
   * Previous value (can be number, object, or null).
   * @type {number|object|null}
   */
  @ApiProperty({
    description:
      'Value for the previous comparison period. This can be numeric, structured, grouped, or null.',
    nullable: true,
    oneOf: [
      { type: 'number', description: 'Single numeric KPI value.' },
      {
        type: 'object',
        description: 'Structured KPI result for the previous period.',
      },
      {
        type: 'array',
        items: { type: 'object', additionalProperties: true },
        description: 'Grouped KPI rows for the previous period.',
      },
      { type: 'null', description: 'No value is available for the previous period.' },
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
