import { ApiProperty } from '@nestjs/swagger';

export class CpuSpeedDto {
  @ApiProperty({
    example: 1.5269886499237566,
    description: 'Current load',
  })
  currentLoad: number;
  @ApiProperty({
    example: 1.1504409845440617,
    description: 'Current user load',
  })
  currentLoadUser: number;
  @ApiProperty({
    example: 0.3662335725322716,
    description: 'Current system load',
  })
  currentLoadSystem: number;
}
