import { ApiProperty } from '@nestjs/swagger';
import { KpiItem } from '../../../entity/KpiItem';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         DTO representing the response for a KPI execution, including KPI metadata and result value.
 *
 * @property        {KpiItem} kpi     The KPI metadata object
 * @property        {number|object|null} value The result value of the KPI execution (can be number, object, array, or null)
 */
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
      { type: 'object', description: 'TrendResult object.' },
      {
        type: 'array',
        items: { type: 'object' },
        description:
          'Array of SparklineMonthPoint or SparklineDayPoint objects.',
      },
      { type: 'object', description: 'Generic object result.' },
      { type: 'null', description: 'Null if no result.' },
    ],
  })
  value?: number | object | null;
}
