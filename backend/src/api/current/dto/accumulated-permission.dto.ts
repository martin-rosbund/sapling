import { ApiProperty } from '@nestjs/swagger';

export class AccumulatedPermissionDto {
  @ApiProperty({
    description: 'Name of the entity for which the permission applies.',
  })
  entityName: string;

  @ApiProperty({
    description: 'Stage in which reading is allowed.',
    nullable: true,
  })
  allowReadStage?: string;

  @ApiProperty({
    description: 'Whether reading is allowed.',
    nullable: true,
  })
  allowRead?: boolean;

  @ApiProperty({
    description: 'Stage in which deletion is allowed.',
    nullable: true,
  })
  allowDeleteStage?: string;

  @ApiProperty({
    description: 'Whether deletion is allowed.',
    nullable: true,
  })
  allowDelete?: boolean;

  @ApiProperty({
    description: 'Stage in which insertion is allowed.',
    nullable: true,
  })
  allowInsertStage?: string;

  @ApiProperty({
    description: 'Whether insertion is allowed.',
    nullable: true,
  })
  allowInsert?: boolean;

  @ApiProperty({
    description: 'Stage in which updating is allowed.',
    nullable: true,
  })
  allowUpdateStage?: string;

  @ApiProperty({
    description: 'Whether updating is allowed.',
    nullable: true,
  })
  allowUpdate?: boolean;

  @ApiProperty({
    description: 'Stage in which showing is allowed.',
    nullable: true,
  })
  allowShowStage?: string;

  @ApiProperty({
    description: 'Whether showing is allowed.',
    nullable: true,
  })
  allowShow?: boolean;
}

export class AccumulatedPermissionBufferDto {
  @ApiProperty({ description: 'Stage for which the permission applies.' })
  stage: string;

  @ApiProperty({ description: 'Whether reading is allowed.' })
  allowRead: boolean;

  @ApiProperty({ description: 'Whether deletion is allowed.' })
  allowDelete: boolean;

  @ApiProperty({ description: 'Whether insertion is allowed.' })
  allowInsert: boolean;

  @ApiProperty({ description: 'Whether updating is allowed.' })
  allowUpdate: boolean;

  @ApiProperty({ description: 'Whether showing is allowed.' })
  allowShow: boolean;
}
