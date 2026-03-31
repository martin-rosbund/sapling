import { ApiProperty } from '@nestjs/swagger';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         DTO representing accumulated permissions for an entity, including stage and boolean values for each permission type.
 *
 * @property        {string} entityHandle           Name of the entity for which the permission applies
 * @property        {string} allowReadStage       Stage in which reading is allowed
 * @property        {boolean} allowRead           Whether reading is allowed
 * @property        {string} allowDeleteStage     Stage in which deletion is allowed
 * @property        {boolean} allowDelete         Whether deletion is allowed
 * @property        {string} allowInsertStage     Stage in which insertion is allowed
 * @property        {boolean} allowInsert         Whether insertion is allowed
 * @property        {string} allowUpdateStage     Stage in which updating is allowed
 * @property        {boolean} allowUpdate         Whether updating is allowed
 * @property        {string} allowShowStage       Stage in which showing is allowed
 * @property        {boolean} allowShow           Whether showing is allowed
 */
export class AccumulatedPermissionDto {
  @ApiProperty({
    description: 'Name of the entity for which the permission applies.',
  })
  entityHandle?: string;

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

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Buffer DTO for permissions per stage, including boolean values for each permission type.
 *
 * @property        {string} stage                Stage for which the permission applies
 * @property        {boolean} allowRead           Whether reading is allowed
 * @property        {boolean} allowDelete         Whether deletion is allowed
 * @property        {boolean} allowInsert         Whether insertion is allowed
 * @property        {boolean} allowUpdate         Whether updating is allowed
 * @property        {boolean} allowShow           Whether showing is allowed
 */
export class AccumulatedPermissionBufferDto {
  @ApiProperty({ description: 'Stage for which the permission applies.' })
  stage?: string;

  @ApiProperty({ description: 'Whether reading is allowed.' })
  allowRead?: boolean;

  @ApiProperty({ description: 'Whether deletion is allowed.' })
  allowDelete?: boolean;

  @ApiProperty({ description: 'Whether insertion is allowed.' })
  allowInsert?: boolean;

  @ApiProperty({ description: 'Whether updating is allowed.' })
  allowUpdate?: boolean;

  @ApiProperty({ description: 'Whether showing is allowed.' })
  allowShow?: boolean;
}
