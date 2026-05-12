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
  @ApiProperty({
    description:
      'KPI configuration and presentation metadata used to interpret the computed result.',
  })
  kpi?: KpiItem;

  /**
   * The result value of the KPI execution. Can be a number, object, trend result, or sparkline array.
   * @type {number|object|null}
   */
  @ApiProperty({
    description:
      'Computed KPI result. Depending on the KPI type this can be a single number, a trend comparison, a sparkline series, grouped rows, or another structured value.',
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

  @ApiPropertyOptional({
    description:
      'Optional drilldown metadata that can be used to navigate from KPI cards or chart points to matching entity records.',
    type: () => KpiDrilldownDto,
    nullable: true,
  })
  drilldown?: KpiDrilldownDto | null;
}
