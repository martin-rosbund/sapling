import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601 } from 'class-validator';

export class ImportGoogleCalendarEventsDto {
  @ApiProperty({
    description: 'Inclusive start of the Google calendar view to import.',
    example: '2026-06-01T00:00:00.000Z',
  })
  @IsISO8601()
  startDateTime!: string;

  @ApiProperty({
    description: 'Inclusive end of the Google calendar view to import.',
    example: '2026-06-07T23:59:59.999Z',
  })
  @IsISO8601()
  endDateTime!: string;
}

export class ImportGoogleCalendarEventsResponseDto {
  @ApiProperty()
  imported!: number;

  @ApiProperty()
  created!: number;

  @ApiProperty()
  updated!: number;

  @ApiProperty()
  skipped!: number;
}
