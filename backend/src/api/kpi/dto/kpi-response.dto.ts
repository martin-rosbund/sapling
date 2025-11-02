
import { ApiProperty } from '@nestjs/swagger';
import { KpiItem } from 'src/entity/KpiItem';

export class KpiResponseDto {
  @ApiProperty({ description: 'The KPI metadata object.' })
  kpi: KpiItem;

  @ApiProperty({
    description: 'The result value of the KPI execution. Can be a number, object, trend result, or sparkline array.',
    oneOf: [
      { type: 'number', description: 'Numeric result value.' },
      { type: 'object', description: 'TrendResult object.' },
      { type: 'array', items: { type: 'object' }, description: 'Array of SparklineMonthPoint or SparklineDayPoint objects.' },
      { type: 'object', description: 'Generic object result.' },
      { type: 'null', description: 'Null if no result.' }
    ]
  })
  value: number | object | null;
}
