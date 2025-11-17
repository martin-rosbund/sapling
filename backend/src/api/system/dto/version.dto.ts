import { ApiProperty } from '@nestjs/swagger';

export class ApplicationVersionDto {
  @ApiProperty({ example: '1.0.0', description: 'Application version.' })
  version: string;
}
