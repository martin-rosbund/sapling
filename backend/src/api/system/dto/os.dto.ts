/**
 * @class OperatingSystemDto
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Data transfer object representing operating system information.
 *
 * @property        {string}    platform    Operating system platform
 * @property        {string}    distro      Operating system distribution
 * @property        {string}    release     Operating system release version
 * @property        {string}    kernel      Operating system kernel version
 * @property        {string}    codename    Operating system codename
 * @property        {string}    arch        Operating system architecture
 * @property        {string}    hostname    Hostname
 * @property        {string}    fqdn        Fully qualified domain name
 * @property        {string}    codepage    Codepage
 * @property        {string}    logofile    Logofile
 */
import { ApiProperty } from '@nestjs/swagger';

export class OperatingSystemDto {
  /** Operating system platform */
  @ApiProperty({
    example: 'Windows',
    description: 'Operating system platform family.',
  })
  platform?: string;
  /** Operating system distribution */
  @ApiProperty({
    example: 'Microsoft Windows 10 Pro',
    description: 'Human-readable operating system distribution or edition.',
  })
  distro?: string;
  /** Operating system release version */
  @ApiProperty({
    example: '10.0.19045',
    description: 'Operating system release version.',
  })
  release?: string;
  /** Operating system kernel version */
  @ApiProperty({
    example: '10.0.19045',
    description: 'Kernel version reported by the operating system.',
  })
  kernel?: string;
  /** Operating system codename */
  @ApiProperty({
    example: '',
    description: 'Operating system codename, when available.',
  })
  codename?: string;
  /** Operating system architecture */
  @ApiProperty({
    example: 'x64',
    description: 'CPU architecture used by the operating system.',
  })
  arch?: string;
  /** Hostname */
  @ApiProperty({
    example: 'localhost',
    description: 'System hostname reported by the operating system.',
  })
  hostname?: string;
  /** Fully qualified domain name */
  @ApiProperty({
    example: 'localhost.local',
    description: 'Fully qualified domain name, when available.',
  })
  fqdn?: string;
  /** Codepage */
  @ApiProperty({
    example: '850',
    description: 'Active system code page, when reported.',
  })
  codepage?: string;
  /** Logofile */
  @ApiProperty({
    example: 'windows',
    description: 'Operating system logo or theme identifier, when available.',
  })
  logofile?: string;
}
