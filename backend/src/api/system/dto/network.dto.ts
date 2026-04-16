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
  @ApiProperty({ example: 'Ethernet', description: 'Network interface' })
  iface?: string;
  /** Network status */
  @ApiProperty({ example: 'up', description: 'Network status' })
  operstate?: string;
  /** Total received bytes */
  @ApiProperty({ example: 3190039035, description: 'Total received bytes' })
  rx_bytes?: number;
  /** Total received dropped bytes */
  @ApiProperty({ example: 573, description: 'Total received dropped bytes' })
  rx_dropped?: number;
  /** Total received error bytes */
  @ApiProperty({ example: 0, description: 'Total received error bytes' })
  rx_errors?: number;
  /** Total transmitted bytes */
  @ApiProperty({ example: 960988592, description: 'Total transmitted bytes' })
  tx_bytes?: number;
  /** Total transmitted dropped bytes */
  @ApiProperty({ example: 0, description: 'Total transmitted dropped bytes' })
  tx_dropped?: number;
  /** Total transmitted error bytes */
  @ApiProperty({ example: 0, description: 'Total transmitted error bytes' })
  tx_errors?: number;
  /** Received bytes per second */
  @ApiProperty({
    example: 7802.289059751746,
    description: 'Received bytes per second',
  })
  rx_sec?: number;
  /** Transmitted bytes per second */
  @ApiProperty({
    example: 4889.642695612844,
    description: 'Transmitted bytes per second',
  })
  tx_sec?: number;
  /** Ping in milliseconds */
  @ApiProperty({ example: 79596, description: 'Ping in milliseconds' })
  ms?: number;
}
