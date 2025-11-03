import { ApiProperty, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { TrendResultDto } from './trend-result.dto';
import { SparklineMonthPointDto } from './sparkline-month-point.dto';
import { SparklineDayPointDto } from './sparkline-day-point.dto';

@ApiExtraModels(TrendResultDto, SparklineMonthPointDto, SparklineDayPointDto)
export class KpiValueDto {
  @ApiProperty({
    description: 'KPI Wert',
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
