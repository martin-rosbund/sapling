import { ApiProperty } from '@nestjs/swagger';

export class MemoryDto {
  @ApiProperty({ example: 33441378304, description: 'Total' })
  total: number;
  @ApiProperty({ example: 16197595136, description: 'Free' })
  free: number;
  @ApiProperty({ example: 17243783168, description: 'Used' })
  used: number;
  @ApiProperty({ example: 17243783168, description: 'Active' })
  active: number;
  @ApiProperty({ example: 16197595136, description: 'Available' })
  available: number;
}
