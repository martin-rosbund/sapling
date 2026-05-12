/**
 * @class FilesystemDto
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Data transfer object representing filesystem information.
 *
 * @property        {string}    fs         Filesystem name
 * @property        {string}    type       Filesystem type
 * @property        {number}    size       Total filesystem size (bytes)
 * @property        {number}    used       Used space (bytes)
 * @property        {number}    available  Available space (bytes)
 * @property        {number}    use        Used space in percent
 */
import { ApiProperty } from '@nestjs/swagger';

export class FilesystemDto {
  /** Filesystem name */
  @ApiProperty({
    example: 'C:',
    description: 'Filesystem identifier or mount point.',
  })
  fs?: string;
  /** Filesystem type */
  @ApiProperty({
    example: 'NTFS',
    description: 'Filesystem type reported by the operating system.',
  })
  type?: string;
  /** Total filesystem size (bytes) */
  @ApiProperty({
    example: 999408267264,
    description: 'Total capacity of the filesystem in bytes.',
  })
  size?: number;
  /** Used space (bytes) */
  @ApiProperty({
    example: 306352164864,
    description: 'Used capacity of the filesystem in bytes.',
  })
  used?: number;
  /** Available space (bytes) */
  @ApiProperty({
    example: 693056102400,
    description: 'Remaining free capacity of the filesystem in bytes.',
  })
  available?: number;
  /** Used space in percent */
  @ApiProperty({
    example: 30.65,
    description: 'Used filesystem capacity as a percentage.',
  })
  use?: number;
}
