import {
  Entity,
  PrimaryKey,
  Property,
  OneToMany,
  Collection,
} from '@mikro-orm/core';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PersonItem } from './PersonItem';
import { Sapling } from './global/entity.decorator';

/**
 * Entity representing an event type or category.
 * Used to classify events and provide icons/colors for display.
 */
@Entity()
export class PersonTypeItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the person type (primary key).
   */
  @ApiProperty()
  @Sapling(['isShowInCompact'])
  @PrimaryKey()
  handle: string;

  /**
   * Icon representing the event type (default: mdi-calendar).
   */
  @ApiProperty()
  @Sapling(['isIcon'])
  @Property({ default: 'mdi-calendar', length: 64, nullable: false })
  icon!: string | null;

  /**
   * Color used for displaying the event type (default: #4CAF50).
   */
  @ApiProperty()
  @Sapling(['isColor'])
  @Property({ default: '#4CAF50', length: 32, nullable: false })
  color!: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Events belonging to this event type.
   */
  @ApiPropertyOptional({ type: () => PersonItem, isArray: true })
  @OneToMany(() => PersonItem, (person) => person.type)
  persons = new Collection<PersonItem>(this);
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the favorite was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the favorite was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
