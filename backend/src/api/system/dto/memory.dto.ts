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
  @ApiProperty({
    example: 33441378304,
    description: 'Total installed system memory in bytes.',
  })
  total?: number;
  /** Free memory (bytes) */
  @ApiProperty({
    example: 16197595136,
    description: 'Currently unused memory in bytes.',
  })
  free?: number;
  /** Used memory (bytes) */
  @ApiProperty({
    example: 17243783168,
    description: 'Currently allocated memory in bytes.',
  })
  used?: number;
  /** Active memory (bytes) */
  @ApiProperty({
    example: 17243783168,
    description:
      'Memory actively in use by processes and the operating system in bytes.',
  })
  active?: number;
  /** Available memory (bytes) */
  @ApiProperty({
    example: 16197595136,
    description: 'Memory that can be allocated without swapping, in bytes.',
  })
  available?: number;
}
