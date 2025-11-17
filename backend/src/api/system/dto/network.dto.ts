import { ApiProperty } from '@nestjs/swagger';

export class NetworkInterfaceDto {
  @ApiProperty({ example: 'Ethernet', description: 'Network interface' })
  iface: string;
  @ApiProperty({ example: 'up', description: 'Network status' })
  operstate: string;
  @ApiProperty({ example: 3190039035, description: 'Total received bytes' })
  rx_bytes: number;
  @ApiProperty({ example: 573, description: 'Total received dropped bytes' })
  rx_dropped: number;
  @ApiProperty({ example: 0, description: 'Total received error bytes' })
  rx_errors: number;
  @ApiProperty({ example: 960988592, description: 'Total transmitted bytes' })
  tx_bytes: number;
  @ApiProperty({ example: 0, description: 'Total transmitted dropped bytes' })
  tx_dropped: number;
  @ApiProperty({ example: 0, description: 'Total transmitted error bytes' })
  tx_errors: number;
  @ApiProperty({
    example: 7802.289059751746,
    description: 'Received bytes per second',
  })
  rx_sec: number;
  @ApiProperty({
    example: 4889.642695612844,
    description: 'Transmitted bytes per second',
  })
  tx_sec: number;
  @ApiProperty({ example: 79596, description: 'Ping in milliseconds' })
  ms: number;
}
