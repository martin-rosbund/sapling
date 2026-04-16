/**
 * @class TimeDto
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Data transfer object representing time information.
 *
 * @property        {string|number}   current        Local server time
 * @property        {string|number}   uptime         Server uptime
 * @property        {string}          timezone       Server timezone
 * @property        {string}          timezoneName   Server timezone name
 */
import { ApiProperty } from '@nestjs/swagger';

export class TimeDto {
  /** Local server time */
  @ApiProperty({ example: '1692347818835', description: 'Local server time' })
  current?: string | number;
  /** Server uptime */
  @ApiProperty({ example: '816962.015', description: 'Uptime' })
  uptime?: string | number;
  /** Server timezone */
  @ApiProperty({ example: 'GMT+0200', description: 'Timezone' })
  timezone?: string;
  /** Server timezone name */
  @ApiProperty({ example: 'Europe/Berlin', description: 'Timezone name' })
  timezoneName?: string;
}
