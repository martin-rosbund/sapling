/**
 * @class ApplicationVersionDto
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Data transfer object representing application version information.
 *
 * @property        {string}   version     Application version
 */
import { ApiProperty } from '@nestjs/swagger';

export class ApplicationVersionDto {
  /** Application version */
  @ApiProperty({ example: '1.0.0', description: 'Application version.' })
  version: string = '0.0.0';
}
