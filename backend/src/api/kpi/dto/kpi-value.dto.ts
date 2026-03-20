import { ApiProperty, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { TrendResultDto } from './trend-result.dto';
import { SparklineMonthPointDto } from './sparkline-month-point.dto';
import { SparklineDayPointDto } from './sparkline-day-point.dto';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         DTO representing the value of a KPI, including possible types for the value property.
 *
 * @property        {number|object|TrendResultDto|SparklineMonthPointDto[]|SparklineDayPointDto[]|null} value The value of the KPI (can be number, object, trend result, array of sparkline points, or null)
 */
@ApiExtraModels(TrendResultDto, SparklineMonthPointDto, SparklineDayPointDto)
export class KpiValueDto {
  /**
   * The value of the KPI (can be number, object, trend result, array of sparkline points, or null).
   * @type {number|object|TrendResultDto|SparklineMonthPointDto[]|SparklineDayPointDto[]|null}
   */
  @ApiProperty({
    description: 'KPI value',
    oneOf: [
      { type: 'number' },
      { type: 'object', $ref: getSchemaPath(TrendResultDto) },
      { type: 'array', items: { $ref: getSchemaPath(SparklineMonthPointDto) } },
      { type: 'array', items: { $ref: getSchemaPath(SparklineDayPointDto) } },
      { type: 'object' },
      { type: 'null' },
    ],
    nullable: true,
  })
  value:
    | number
    | object
    | TrendResultDto
    | SparklineMonthPointDto[]
    | SparklineDayPointDto[]
    | null;
}
