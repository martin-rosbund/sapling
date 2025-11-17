import { ApiProperty } from '@nestjs/swagger';

export class ApplicationStateDto {
  @ApiProperty({
    example: true,
    description: 'Indicates if the application is ready',
  })
  isReady: boolean;
}
