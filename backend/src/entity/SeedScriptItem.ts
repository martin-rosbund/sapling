import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';

@Entity()
export class SeedScriptItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the person (primary key).
   */
  @ApiProperty()
  @PrimaryKey({ autoincrement: true })
  handle?: number;

  /**
   * Name of the executed seed script.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 256, nullable: false })
  scriptName!: string;

  /**
   * Name of the entity affected by the seed script.
   */
  @ApiProperty()
  @Property({ length: 64, nullable: false })
  entityName!: string;

  /**
   * Date and time when the seed script was executed.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime' })
  executedAt!: Date;

  /**
   * Indicates whether the seed script execution was successful or not.
   * This can be used to track the status of seed script executions and identify any issues.
   */
  @ApiProperty()
  @Property({ default: true, nullable: false })
  isSuccess!: boolean;
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the seed script item was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the person was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  //#endregion
}
