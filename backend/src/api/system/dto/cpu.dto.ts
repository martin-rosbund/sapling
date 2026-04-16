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
  @ApiProperty({ example: 'AMD', description: 'Manufacturer' })
  manufacturer?: string;
  /** CPU brand */
  @ApiProperty({
    example: 'Ryzen 7 7700X 8-Core Processor',
    description: 'Brand',
  })
  brand?: string;
  /** CPU vendor */
  @ApiProperty({ example: 'AuthenticAMD', description: 'Vendor' })
  vendor?: string;
  /** CPU family */
  @ApiProperty({ example: '25', description: 'Family' })
  family?: string;
  /** CPU model */
  @ApiProperty({ example: '97', description: 'Model' })
  model?: string;
  /** CPU stepping */
  @ApiProperty({ example: '2', description: 'Stepping' })
  stepping?: string;
  /** CPU revision */
  @ApiProperty({ example: '24834', description: 'Revision' })
  revision?: string;
  /** CPU voltage */
  @ApiProperty({ example: '', description: 'Voltage' })
  voltage?: string;
  /** CPU speed (GHz) */
  @ApiProperty({ example: 4.5, description: 'Speed' })
  speed?: number;
  /** Minimum CPU speed (GHz) */
  @ApiProperty({ example: 4.5, description: 'Minimum Speed' })
  speedMin?: number;
  /** Maximum CPU speed (GHz) */
  @ApiProperty({ example: 4.5, description: 'Maximum Speed' })
  speedMax?: number;
  /** Power save governor */
  @ApiProperty({ example: '', description: 'Power Save' })
  governor?: string;
  /** Number of CPU cores */
  @ApiProperty({ example: 16, description: 'Number of Cores' })
  cores?: number;
  /** Number of physical CPU cores */
  @ApiProperty({ example: 8, description: 'Number of Physical Cores' })
  physicalCores?: number;
  /** Number of performance CPU cores (optional) */
  @ApiProperty({
    example: 16,
    description: 'Number of Performance Cores',
    required: false,
  })
  performanceCores?: number;
  /** Number of efficiency CPU cores (optional) */
  @ApiProperty({
    example: 0,
    description: 'Number of Efficiency Cores',
    required: false,
  })
  efficiencyCores?: number;
  /** Number of processors */
  @ApiProperty({ example: 1, description: 'Number of Processors' })
  processors?: number;
  /** CPU socket type */
  @ApiProperty({ example: 'Other', description: 'Socket' })
  socket?: string;
  /** CPU flags */
  @ApiProperty({
    example:
      'de pse tsc msr sep mtrr mca cmov psn clfsh ds mmx fxsr sse sse2 ss htt tm ia64 pbe',
    description: 'Flags',
  })
  flags?: string;
  /** Virtualization support */
  @ApiProperty({ example: false, description: 'Virtualized' })
  virtualization?: boolean;
}
