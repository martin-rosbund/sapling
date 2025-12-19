import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
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
   * Unique identifier for the person type (primary key).
   */
  @ApiProperty()
  @Sapling(['isSecurity'])
  @PrimaryKey()
  handle: string;

  /**
   * Access token for the session.
   */
  @ApiProperty()
  @Sapling(['isSecurity'])
  @Property({ length: 64, nullable: false })
  accessToken!: string | null;

  /**
   * Access token for the session.
   */
  @ApiProperty()
  @Sapling(['isSecurity'])
  @Property({ length: 64, nullable: false })
  refreshToken!: string | null;
  //#endregion

  //#region Properties: Relation
  /**
   * The person this dashboard belongs to.
   */
  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson'])
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: PersonItem;
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the favorite was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the favorite was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
