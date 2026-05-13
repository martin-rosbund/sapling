/**
 * @class NetworkInterfaceDto
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Data transfer object representing network interface information.
 *
 * @property        {string}    iface           Network interface name
 * @property        {string}    operstate       Network status
 * @property        {number}    rx_bytes        Total received bytes
 * @property        {number}    rx_dropped      Total received dropped bytes
 * @property        {number}    rx_errors       Total received error bytes
 * @property        {number}    tx_bytes        Total transmitted bytes
 * @property        {number}    tx_dropped      Total transmitted dropped bytes
 * @property        {number}    tx_errors       Total transmitted error bytes
 * @property        {number}    rx_sec          Received bytes per second
 * @property        {number}    tx_sec          Transmitted bytes per second
 * @property        {number}    ms              Ping in milliseconds
 */
import { ApiProperty } from '@nestjs/swagger';

export class NetworkInterfaceDto {
  /** Network interface name */
  @ApiProperty({
    example: 'Ethernet',
    description: 'Display name of the network interface.',
  })
  iface?: string;
  /** Network status */
  @ApiProperty({
    example: 'up',
    description: 'Operational state of the network interface.',
  })
  operstate?: string;
  /** Total received bytes */
  @ApiProperty({
    example: 3190039035,
    description: 'Total bytes received through this interface since boot.',
  })
  rx_bytes?: number;
  /** Total received dropped bytes */
  @ApiProperty({
    example: 573,
    description: 'Received packets or frames dropped by this interface.',
  })
  rx_dropped?: number;
  /** Total received error bytes */
  @ApiProperty({
    example: 0,
    description: 'Receive errors reported for this interface.',
  })
  rx_errors?: number;
  /** Total transmitted bytes */
  @ApiProperty({
    example: 960988592,
    description: 'Total bytes transmitted through this interface since boot.',
  })
  tx_bytes?: number;
  /** Total transmitted dropped bytes */
  @ApiProperty({
    example: 0,
    description: 'Transmitted packets or frames dropped by this interface.',
  })
  tx_dropped?: number;
  /** Total transmitted error bytes */
  @ApiProperty({
    example: 0,
    description: 'Transmit errors reported for this interface.',
  })
  tx_errors?: number;
  /** Received bytes per second */
  @ApiProperty({
    example: 7802.289059751746,
    description: 'Current receive throughput in bytes per second.',
  })
  rx_sec?: number;
  /** Transmitted bytes per second */
  @ApiProperty({
    example: 4889.642695612844,
    description: 'Current transmit throughput in bytes per second.',
  })
  tx_sec?: number;
  /** Sampling interval in milliseconds */
  @ApiProperty({
    example: 79596,
    description:
      'Measurement interval in milliseconds used to calculate the reported network rates.',
  })
  ms?: number;
}
