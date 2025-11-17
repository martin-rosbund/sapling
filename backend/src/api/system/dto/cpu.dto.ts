import { ApiProperty } from '@nestjs/swagger';

export class CpuDto {
  @ApiProperty({ example: 'AMD', description: 'Manufacturer' })
  manufacturer: string;
  @ApiProperty({
    example: 'Ryzen 7 7700X 8-Core Processor',
    description: 'Brand',
  })
  brand: string;
  @ApiProperty({ example: 'AuthenticAMD', description: 'Vendor' })
  vendor: string;
  @ApiProperty({ example: '25', description: 'Family' })
  family: string;
  @ApiProperty({ example: '97', description: 'Model' })
  model: string;
  @ApiProperty({ example: '2', description: 'Stepping' })
  stepping: string;
  @ApiProperty({ example: '24834', description: 'Revision' })
  revision: string;
  @ApiProperty({ example: '', description: 'Voltage' })
  voltage: string;
  @ApiProperty({ example: 4.5, description: 'Speed' })
  speed: number;
  @ApiProperty({ example: 4.5, description: 'Minimum Speed' })
  speedMin: number;
  @ApiProperty({ example: 4.5, description: 'Maximum Speed' })
  speedMax: number;
  @ApiProperty({ example: '', description: 'Power Save' })
  governor: string;
  @ApiProperty({ example: 16, description: 'Number of Cores' })
  cores: number;
  @ApiProperty({ example: 8, description: 'Number of Physical Cores' })
  physicalCores: number;
  @ApiProperty({
    example: 16,
    description: 'Number of Performance Cores',
    required: false,
  })
  performanceCores?: number;
  @ApiProperty({
    example: 0,
    description: 'Number of Efficiency Cores',
    required: false,
  })
  efficiencyCores?: number;
  @ApiProperty({ example: 1, description: 'Number of Processors' })
  processors: number;
  @ApiProperty({ example: 'Other', description: 'Socket' })
  socket: string;
  @ApiProperty({
    example:
      'de pse tsc msr sep mtrr mca cmov psn clfsh ds mmx fxsr sse sse2 ss htt tm ia64 pbe',
    description: 'Flags',
  })
  flags: string;
  @ApiProperty({ example: false, description: 'Virtualized' })
  virtualization: boolean;
}
