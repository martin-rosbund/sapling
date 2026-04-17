import { ApiProperty } from '@nestjs/swagger';

export class TimelineFilterDto {
  @ApiProperty({ type: Object })
  filter: Record<string, unknown> = {};
}

export class TimelineSummaryGroupItemDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ required: false, nullable: true })
  color?: string | null;

  @ApiProperty({ required: false, nullable: true })
  icon?: string | null;

  @ApiProperty()
  count: number = 0;

  @ApiProperty({ required: false, nullable: true })
  amount?: number | null;

  @ApiProperty({ required: false, nullable: true })
  moneyField?: string | null;

  @ApiProperty({ type: Object })
  drilldownFilter: Record<string, unknown> = {};
}

export class TimelineSummaryGroupDto {
  @ApiProperty()
  field!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ type: [TimelineSummaryGroupItemDto] })
  items: TimelineSummaryGroupItemDto[] = [];
}

export class TimelineEntitySummaryDto {
  @ApiProperty()
  entityHandle!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ required: false, nullable: true })
  relationCategory?: string | null;

  @ApiProperty({ type: [String] })
  relationFields: string[] = [];

  @ApiProperty()
  count: number = 0;

  @ApiProperty()
  startCount: number = 0;

  @ApiProperty()
  endCount: number = 0;

  @ApiProperty()
  startField: string = 'createdAt';

  @ApiProperty()
  endField: string = 'updatedAt';

  @ApiProperty({ type: Object })
  startFilter: Record<string, unknown> = {};

  @ApiProperty({ type: Object })
  endFilter: Record<string, unknown> = {};

  @ApiProperty({ type: [TimelineSummaryGroupDto] })
  groups: TimelineSummaryGroupDto[] = [];
}

export class TimelineMonthDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  start!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  end!: string;

  @ApiProperty({ type: [TimelineEntitySummaryDto] })
  entities: TimelineEntitySummaryDto[] = [];
}

export class TimelineRecordAnchorDto {
  @ApiProperty()
  entityHandle!: string;

  @ApiProperty({ type: String })
  handle!: string | number;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  startField: string = 'createdAt';

  @ApiProperty()
  endField: string = 'updatedAt';

  @ApiProperty({ required: false, nullable: true })
  startAt?: string | null;

  @ApiProperty({ required: false, nullable: true })
  endAt?: string | null;

  @ApiProperty({ type: Object })
  record: Record<string, unknown> = {};
}

export class TimelineResponseDto {
  @ApiProperty()
  entityHandle!: string;

  @ApiProperty({ type: String })
  handle!: string | number;

  @ApiProperty({ type: TimelineRecordAnchorDto })
  anchor: TimelineRecordAnchorDto = new TimelineRecordAnchorDto();

  @ApiProperty({ required: false, nullable: true })
  nextBefore?: string | null;

  @ApiProperty()
  hasMore: boolean = false;

  @ApiProperty({ type: [TimelineMonthDto] })
  months: TimelineMonthDto[] = [];
}
