/**
 * @class ApplicationStateDto
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Data transfer object representing application state information.
 *
 * @property        {boolean}   isReady     Indicates if the application is ready
 */
import { ApiProperty } from '@nestjs/swagger';

export class ApplicationStateDto {
  /** Indicates if the application is ready */
  @ApiProperty({
    example: true,
    description:
      'Indicates whether the backend has finished bootstrapping and is ready to serve requests.',
  })
  isReady: boolean = false;
}
