import { ApiExtraModels, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@ApiExtraModels()
export class KpiDrilldownEntryDto {
  @ApiProperty({ description: 'Stable entry key for drilldown navigation.' })
  key!: string;

  @ApiProperty({ description: 'Human readable label for the drilldown entry.' })
  label!: string;

  @ApiProperty({
    description: 'Effective filter used to navigate to the drilled down entity view.',
    type: 'object',
    additionalProperties: true,
  })
  filter!: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Optional metric value associated with this drilldown entry.',
    nullable: true,
    oneOf: [{ type: 'number' }, { type: 'object' }, { type: 'array' }],
  })
  value?: number | object | Array<Record<string, unknown>> | null;
}

@ApiExtraModels(KpiDrilldownEntryDto)
export class KpiDrilldownDto {
  @ApiProperty({ description: 'Target entity handle used for drilldown navigation.' })
  entityHandle!: string;

  @ApiProperty({
    description: 'Base filter contributed by the KPI definition itself.',
    type: 'object',
    additionalProperties: true,
  })
  baseFilter!: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Current period drilldown target for trend-style KPIs.',
    type: () => KpiDrilldownEntryDto,
    nullable: true,
  })
  current?: KpiDrilldownEntryDto;

  @ApiPropertyOptional({
    description: 'Previous period drilldown target for trend-style KPIs.',
    type: () => KpiDrilldownEntryDto,
    nullable: true,
  })
  previous?: KpiDrilldownEntryDto;

  @ApiPropertyOptional({
    description: 'Per-point drilldown targets for sparkline-style KPIs.',
    type: () => KpiDrilldownEntryDto,
    isArray: true,
    nullable: true,
  })
  items?: KpiDrilldownEntryDto[];
}