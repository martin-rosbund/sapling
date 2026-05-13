import { ApiProperty, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { TrendResultDto } from './trend-result.dto';
import { SparklineMonthPointDto } from './sparkline-month-point.dto';
import { SparklineDayPointDto } from './sparkline-day-point.dto';
import { SparklineWeekPointDto } from './sparkline-week-point.dto';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         DTO representing the value of a KPI, including possible types for the value property.
 *
 * @property        {number|object|TrendResultDto|SparklineMonthPointDto[]|SparklineDayPointDto[]|null} value The value of the KPI (can be number, object, trend result, array of sparkline points, or null)
 */
@ApiExtraModels(
  TrendResultDto,
  SparklineMonthPointDto,
  SparklineDayPointDto,
  SparklineWeekPointDto,
)
export class KpiValueDto {
  /**
   * The value of the KPI (can be number, object, trend result, array of sparkline points, or null).
   * @type {number|object|TrendResultDto|SparklineMonthPointDto[]|SparklineDayPointDto[]|null}
   */
  @ApiProperty({
    description:
      'Computed KPI value. Depending on the KPI type this can be a single number, a trend comparison, a sparkline series, grouped rows, or another structured value.',
    oneOf: [
      { type: 'number', description: 'Single numeric KPI result.' },
      { $ref: getSchemaPath(TrendResultDto) },
      {
        type: 'array',
        items: { $ref: getSchemaPath(SparklineMonthPointDto) },
        description: 'Monthly sparkline series.',
      },
      {
        type: 'array',
        items: { $ref: getSchemaPath(SparklineDayPointDto) },
        description: 'Daily sparkline series.',
      },
      {
        type: 'array',
        items: { $ref: getSchemaPath(SparklineWeekPointDto) },
        description: 'Weekly sparkline series.',
      },
      {
        type: 'array',
        items: { type: 'object', additionalProperties: true },
        description: 'Grouped KPI rows for table-style results.',
      },
      {
        type: 'object',
        description: 'Structured KPI result object for custom visualizations.',
      },
      { type: 'null', description: 'No KPI result is available.' },
    ],
    nullable: true,
  })
  value?:
    | number
    | object
    | TrendResultDto
    | SparklineMonthPointDto[]
    | SparklineDayPointDto[]
    | SparklineWeekPointDto[]
    | Array<Record<string, unknown>>
    | null;
}
