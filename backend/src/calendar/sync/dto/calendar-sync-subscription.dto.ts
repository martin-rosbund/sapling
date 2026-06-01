import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { CalendarSyncRange } from '../../../entity/CalendarSyncSubscriptionItem';

export class CalendarSyncSubscriptionDto {
  @ApiPropertyOptional()
  handle?: number;

  @ApiProperty()
  isAvailable!: boolean;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ enum: ['day', 'week', 'month'] })
  syncRange!: CalendarSyncRange;

  @ApiProperty()
  intervalMinutes!: number;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  lastRunAt?: Date | null;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  lastSuccessAt?: Date | null;

  @ApiPropertyOptional()
  lastError?: string | null;

  @ApiProperty()
  lastImportedCount!: number;

  @ApiProperty()
  lastCreatedCount!: number;

  @ApiProperty()
  lastUpdatedCount!: number;

  @ApiProperty()
  lastSkippedCount!: number;
}

export class UpdateCalendarSyncSubscriptionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: ['day', 'week', 'month'] })
  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  syncRange?: CalendarSyncRange;

  @ApiPropertyOptional({ minimum: 5, maximum: 1440 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  intervalMinutes?: number;
}
