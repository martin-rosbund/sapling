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
    description: 'Current load',
  })
  currentLoad?: number;
  /** Current CPU user load */
  @ApiProperty({
    example: 1.1504409845440617,
    description: 'Current user load',
  })
  currentLoadUser?: number;
  /** Current CPU system load */
  @ApiProperty({
    example: 0.3662335725322716,
    description: 'Current system load',
  })
  currentLoadSystem?: number;
}
