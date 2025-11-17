import { ApiProperty } from '@nestjs/swagger';

export class FilesystemDto {
  @ApiProperty({ example: 'C:', description: 'Name' })
  fs: string;
  @ApiProperty({ example: 'NTFS', description: 'Type' })
  type: string;
  @ApiProperty({ example: 999408267264, description: 'Total size' })
  size: number;
  @ApiProperty({ example: 306352164864, description: 'Used space' })
  used: number;
  @ApiProperty({ example: 693056102400, description: 'Available space' })
  available: number;
  @ApiProperty({ example: 30.65, description: 'Used space in percent' })
  use: number;
}
