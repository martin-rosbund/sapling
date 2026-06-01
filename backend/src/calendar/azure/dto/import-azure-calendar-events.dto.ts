import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601 } from 'class-validator';

export class ImportAzureCalendarEventsDto {
  @ApiProperty({
    description: 'Inclusive start of the Outlook calendar view to import.',
    example: '2026-06-01T00:00:00.000Z',
  })
  @IsISO8601()
  startDateTime!: string;

  @ApiProperty({
    description: 'Inclusive end of the Outlook calendar view to import.',
    example: '2026-06-07T23:59:59.999Z',
  })
  @IsISO8601()
  endDateTime!: string;
}

export class ImportAzureCalendarEventsResponseDto {
  @ApiProperty()
  imported!: number;

  @ApiProperty()
  created!: number;

  @ApiProperty()
  updated!: number;

  @ApiProperty()
  skipped!: number;
}
