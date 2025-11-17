import { ApiProperty } from '@nestjs/swagger';

export class OperatingSystemDto {
  @ApiProperty({ example: 'Windows', description: 'Platform' })
  platform: string;
  @ApiProperty({
    example: 'Microsoft Windows 10 Pro',
    description: 'Distribution',
  })
  distro: string;
  @ApiProperty({ example: '10.0.19045', description: 'Release' })
  release: string;
  @ApiProperty({ example: '10.0.19045', description: 'Kernel' })
  kernel: string;
  @ApiProperty({ example: '', description: 'Codename' })
  codename: string;
  @ApiProperty({ example: 'x64', description: 'Architecture' })
  arch: string;
  @ApiProperty({ example: 'localhost', description: 'Hostname' })
  hostname: string;
  @ApiProperty({ example: 'localhost.local', description: 'FQDN' })
  fqdn: string;
  @ApiProperty({ example: '850', description: 'Codepage' })
  codepage: string;
  @ApiProperty({ example: 'windows', description: 'Logofile' })
  logofile: string;
}
