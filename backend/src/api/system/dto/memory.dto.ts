/**
 * @class MemoryDto
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Data transfer object representing memory information.
 *
 * @property        {number}    total       Total memory (bytes)
 * @property        {number}    free        Free memory (bytes)
 * @property        {number}    used        Used memory (bytes)
 * @property        {number}    active      Active memory (bytes)
 * @property        {number}    available   Available memory (bytes)
 */
import { ApiProperty } from '@nestjs/swagger';

export class MemoryDto {
  /** Total memory (bytes) */
  @ApiProperty({ example: 33441378304, description: 'Total' })
  total: number;
  /** Free memory (bytes) */
  @ApiProperty({ example: 16197595136, description: 'Free' })
  free: number;
  /** Used memory (bytes) */
  @ApiProperty({ example: 17243783168, description: 'Used' })
  used: number;
  /** Active memory (bytes) */
  @ApiProperty({ example: 17243783168, description: 'Active' })
  active: number;
  /** Available memory (bytes) */
  @ApiProperty({ example: 16197595136, description: 'Available' })
  available: number;
}
