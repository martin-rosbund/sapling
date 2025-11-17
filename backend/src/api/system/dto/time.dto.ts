import { ApiProperty } from '@nestjs/swagger';

export class TimeDto {
  @ApiProperty({ example: '1692347818835', description: 'Local server time' })
  current: string | number;
  @ApiProperty({ example: '816962.015', description: 'Uptime' })
  uptime: string | number;
  @ApiProperty({ example: 'GMT+0200', description: 'Timezone' })
  timezone: string;
  @ApiProperty({ example: 'Europe/Berlin', description: 'Timezone name' })
  timezoneName: string;
}
