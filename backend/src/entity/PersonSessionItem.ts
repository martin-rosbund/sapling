import { Entity, Property, OneToOne } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';
import { PersonItem } from './PersonItem';
import { Sapling } from './global/entity.decorator';

/**
 * Entity representing an event type or category.
 * Used to classify events and provide icons/colors for display.
 */
@Entity()
export class PersonSessionItem {
  //#region Properties: Persisted
  /**
   * Session number for the session (not primary key).
   */
  @ApiProperty()
  @Sapling(['isSecurity', 'isOrderASC'])
  @Property({ length: 128, nullable: false })
  number!: string;

  /**
   * Access token for the session.
   */
  @ApiProperty()
  @Sapling(['isSecurity'])
  @Property({ length: 2048, nullable: false })
  accessToken!: string;

  /**
   * Access token for the session.
   */
  @ApiProperty()
  @Sapling(['isSecurity'])
  @Property({ length: 2048, nullable: false })
  refreshToken!: string;
  //#endregion

  //#region Properties: Relation
  /**
   * The person this session belongs to (also primary key, one-to-one).
   */
  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson'])
  @OneToOne(() => PersonItem, { primary: true, nullable: false })
  person!: PersonItem;
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the dashboard was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the dashboard was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  //#endregion
}
