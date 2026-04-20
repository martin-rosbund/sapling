import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger';
import { KpiItem } from '../../../entity/KpiItem';
import { TrendResultDto } from './trend-result.dto';
import { SparklineMonthPointDto } from './sparkline-month-point.dto';
import { SparklineDayPointDto } from './sparkline-day-point.dto';
import { SparklineWeekPointDto } from './sparkline-week-point.dto';
import { KpiDrilldownDto } from './kpi-drilldown.dto';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         DTO representing the response for a KPI execution, including KPI metadata and result value.
 *
 * @property        {KpiItem} kpi     The KPI metadata object
 * @property        {number|object|null} value The result value of the KPI execution (can be number, object, array, or null)
 */
@ApiExtraModels(
  TrendResultDto,
  SparklineMonthPointDto,
  SparklineDayPointDto,
  SparklineWeekPointDto,
  KpiDrilldownDto,
)
export class KpiResponseDto {
  /**
   * The KPI metadata object.
   * @type {KpiItem}
   */
  @ApiProperty({ description: 'The KPI metadata object.' })
  kpi?: KpiItem;

  /**
   * The result value of the KPI execution. Can be a number, object, trend result, or sparkline array.
   * @type {number|object|null}
   */
  @ApiProperty({
    description:
      'The result value of the KPI execution. Can be a number, object, trend result, or sparkline array.',
    oneOf: [
      { type: 'number', description: 'Numeric result value.' },
      { $ref: getSchemaPath(TrendResultDto) },
      {
        type: 'array',
        items: { $ref: getSchemaPath(SparklineMonthPointDto) },
        description: 'Array of monthly sparkline points.',
      },
      {
        type: 'array',
        items: { $ref: getSchemaPath(SparklineDayPointDto) },
        description: 'Array of daily sparkline points.',
      },
      {
        type: 'array',
        items: { $ref: getSchemaPath(SparklineWeekPointDto) },
        description: 'Array of weekly sparkline points.',
      },
      {
        type: 'array',
        items: { type: 'object', additionalProperties: true },
        description: 'Array of grouped KPI rows.',
      },
      { type: 'object', description: 'Generic object result.' },
      { type: 'null', description: 'Null if no result.' },
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

  @ApiPropertyOptional({
    description: 'Optional drilldown metadata for KPI cards and chart points.',
    type: () => KpiDrilldownDto,
    nullable: true,
  })
  drilldown?: KpiDrilldownDto | null;
}
