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
  @ApiProperty({ example: 'Windows', description: 'Platform' })
  platform: string;
  /** Operating system distribution */
  @ApiProperty({
    example: 'Microsoft Windows 10 Pro',
    description: 'Distribution',
  })
  distro: string;
  /** Operating system release version */
  @ApiProperty({ example: '10.0.19045', description: 'Release' })
  release: string;
  /** Operating system kernel version */
  @ApiProperty({ example: '10.0.19045', description: 'Kernel' })
  kernel: string;
  /** Operating system codename */
  @ApiProperty({ example: '', description: 'Codename' })
  codename: string;
  /** Operating system architecture */
  @ApiProperty({ example: 'x64', description: 'Architecture' })
  arch: string;
  /** Hostname */
  @ApiProperty({ example: 'localhost', description: 'Hostname' })
  hostname: string;
  /** Fully qualified domain name */
  @ApiProperty({ example: 'localhost.local', description: 'FQDN' })
  fqdn: string;
  /** Codepage */
  @ApiProperty({ example: '850', description: 'Codepage' })
  codepage: string;
  /** Logofile */
  @ApiProperty({ example: 'windows', description: 'Logofile' })
  logofile: string;
}
