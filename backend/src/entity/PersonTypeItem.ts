import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PersonItem } from './PersonItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

/**
 * @class PersonTypeItem
 * @version 1.0
 * @author Martin Rosbund
 * @summary Entity representing a person type or category.
 * @description Used to classify persons and provide icons/colors for display. Contains type details and relations to persons.
 *
 * @property {string} handle - Unique identifier for the person type (primary key).
 * @property {string} [icon] - Icon representing the person type (default: mdi-calendar).
 * @property {string} color - Color used for displaying the person type (default: #4CAF50).
 * @property {Collection<PersonItem>} persons - Persons belonging to this type.
 * @property {Date} createdAt - Date and time when the person type was created.
 * @property {Date} updatedAt - Date and time when the person type was last updated.
 */
@Entity()
export class PersonTypeItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the person type (primary key).
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ primary: true, length: 64 })
  handle!: string;

  /**
   * Icon representing the event type (default: mdi-calendar).
   */
  @ApiProperty()
  @Sapling(['isIcon'])
  @SaplingForm({
    order: 100,
    group: 'personType.groupAppearance',
    groupOrder: 100,
    width: 1,
  })
  @Property({ default: 'mdi-calendar', length: 64, nullable: false })
  icon?: string = 'mdi-calendar';

  /**
   * Color used for displaying the event type (default: #4CAF50).
   */
  @ApiProperty()
  @Sapling(['isColor'])
  @SaplingForm({
    order: 200,
    group: 'personType.groupAppearance',
    groupOrder: 100,
    width: 1,
  })
  @Property({ default: '#4CAF50', length: 32, nullable: false })
  color!: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Events belonging to this event type.
   */
  @ApiPropertyOptional({ type: () => PersonItem, isArray: true })
  @OneToMany(() => PersonItem, (person) => person.type)
  persons: Collection<PersonItem> = new Collection<PersonItem>(this);
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
