/**
 * @class CpuSpeedDto
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Data transfer object representing CPU load and speed information.
 *
 * @property        {number}    currentLoad         Current CPU load
 * @property        {number}    currentLoadUser     Current CPU user load
 * @property        {number}    currentLoadSystem   Current CPU system load
 */
import { ApiProperty } from '@nestjs/swagger';

export class CpuSpeedDto {
  /** Current CPU load */
  @ApiProperty({
    example: 1.5269886499237566,
    description: 'Current overall CPU load percentage.',
  })
  currentLoad?: number;
  /** Current CPU user load */
  @ApiProperty({
    example: 1.1504409845440617,
    description: 'Current CPU load caused by user-space processes.',
  })
  currentLoadUser?: number;
  /** Current CPU system load */
  @ApiProperty({
    example: 0.3662335725322716,
    description: 'Current CPU load caused by kernel or system processes.',
  })
  currentLoadSystem?: number;
}
