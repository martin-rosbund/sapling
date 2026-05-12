/**
 * @class CpuDto
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Data transfer object representing CPU information.
 *
 * @property        {string}    manufacturer         CPU manufacturer
 * @property        {string}    brand                CPU brand
 * @property        {string}    vendor               CPU vendor
 * @property        {string}    family               CPU family
 * @property        {string}    model                CPU model
 * @property        {string}    stepping             CPU stepping
 * @property        {string}    revision             CPU revision
 * @property        {string}    voltage              CPU voltage
 * @property        {number}    speed                CPU speed (GHz)
 * @property        {number}    speedMin             Minimum CPU speed (GHz)
 * @property        {number}    speedMax             Maximum CPU speed (GHz)
 * @property        {string}    governor             Power save governor
 * @property        {number}    cores                Number of CPU cores
 * @property        {number}    physicalCores        Number of physical CPU cores
 * @property        {number}    performanceCores     Number of performance CPU cores (optional)
 * @property        {number}    efficiencyCores      Number of efficiency CPU cores (optional)
 * @property        {number}    processors           Number of processors
 * @property        {string}    socket               CPU socket type
 * @property        {string}    flags                CPU flags
 * @property        {boolean}   virtualization       Virtualization support
 */
import { ApiProperty } from '@nestjs/swagger';

export class CpuDto {
  /** CPU manufacturer */
  @ApiProperty({
    example: 'AMD',
    description: 'CPU manufacturer reported by the operating system.',
  })
  manufacturer?: string;
  /** CPU brand */
  @ApiProperty({
    example: 'Ryzen 7 7700X 8-Core Processor',
    description: 'Commercial CPU brand or model name.',
  })
  brand?: string;
  /** CPU vendor */
  @ApiProperty({
    example: 'AuthenticAMD',
    description: 'Low-level CPU vendor identifier.',
  })
  vendor?: string;
  /** CPU family */
  @ApiProperty({
    example: '25',
    description: 'Processor family identifier reported by the system.',
  })
  family?: string;
  /** CPU model */
  @ApiProperty({
    example: '97',
    description: 'Processor model identifier reported by the system.',
  })
  model?: string;
  /** CPU stepping */
  @ApiProperty({
    example: '2',
    description: 'Processor stepping identifier.',
  })
  stepping?: string;
  /** CPU revision */
  @ApiProperty({
    example: '24834',
    description: 'Processor revision identifier, when available.',
  })
  revision?: string;
  /** CPU voltage */
  @ApiProperty({
    example: '',
    description: 'Reported CPU voltage, when exposed by the host system.',
  })
  voltage?: string;
  /** CPU speed (GHz) */
  @ApiProperty({
    example: 4.5,
    description: 'Current CPU clock speed in GHz.',
  })
  speed?: number;
  /** Minimum CPU speed (GHz) */
  @ApiProperty({
    example: 4.5,
    description: 'Minimum reported CPU clock speed in GHz.',
  })
  speedMin?: number;
  /** Maximum CPU speed (GHz) */
  @ApiProperty({
    example: 4.5,
    description: 'Maximum reported CPU clock speed in GHz.',
  })
  speedMax?: number;
  /** Power save governor */
  @ApiProperty({
    example: '',
    description: 'CPU governor or power-management mode, when available.',
  })
  governor?: string;
  /** Number of CPU cores */
  @ApiProperty({
    example: 16,
    description: 'Total number of logical CPU cores.',
  })
  cores?: number;
  /** Number of physical CPU cores */
  @ApiProperty({
    example: 8,
    description: 'Total number of physical CPU cores.',
  })
  physicalCores?: number;
  /** Number of performance CPU cores (optional) */
  @ApiProperty({
    example: 16,
    description: 'Number of performance-oriented CPU cores, when reported.',
    required: false,
  })
  performanceCores?: number;
  /** Number of efficiency CPU cores (optional) */
  @ApiProperty({
    example: 0,
    description: 'Number of efficiency-oriented CPU cores, when reported.',
    required: false,
  })
  efficiencyCores?: number;
  /** Number of processors */
  @ApiProperty({
    example: 1,
    description: 'Number of physical processor packages installed.',
  })
  processors?: number;
  /** CPU socket type */
  @ApiProperty({
    example: 'Other',
    description: 'Reported CPU socket type, when available.',
  })
  socket?: string;
  /** CPU flags */
  @ApiProperty({
    example:
      'de pse tsc msr sep mtrr mca cmov psn clfsh ds mmx fxsr sse sse2 ss htt tm ia64 pbe',
    description: 'Processor feature flags reported by the operating system.',
  })
  flags?: string;
  /** Virtualization support */
  @ApiProperty({
    example: false,
    description: 'Indicates whether the runtime appears to be virtualized.',
  })
  virtualization?: boolean;
}
