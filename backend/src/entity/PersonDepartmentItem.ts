import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PersonItem } from './PersonItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

/**
 * @class PersonDepartmentItem
 * @version 1.0
 * @author Martin Rosbund
 * @summary Entity representing a person department.
 * @description Used to group persons by department and provide icons/colors for display. Contains department details and relations to persons.
 *
 * @property {string} handle - Unique identifier for the person department (primary key).
 * @property {string} description - Description of the status (display name).
 * @property {string} [icon] - Icon representing the person department (default: mdi-calendar).
 * @property {string} color - Color used for displaying the person department (default: #4CAF50).
 * @property {Collection<PersonItem>} persons - Persons belonging to this department.
 * @property {Date} createdAt - Date and time when the person department was created.
 * @property {Date} updatedAt - Date and time when the person department was last updated.
 */
@Entity()
export class PersonDepartmentItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the person department (primary key).
   */
  @ApiProperty()
  @Property({ primary: true, length: 64 })
  handle!: string;

  /**
   * Description of the person department (display name).
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'personDepartment.groupContent',
    groupOrder: 100,
    width: 4,
  })
  @Property({ length: 128, nullable: false })
  description!: string;

  /**
   * Icon representing the person department (default: mdi-calendar).
   */
  @ApiProperty()
  @Sapling(['isIcon'])
  @SaplingForm({
    order: 100,
    group: 'personDepartment.groupAppearance',
    groupOrder: 200,
    width: 1,
  })
  @Property({ default: 'mdi-calendar', length: 64, nullable: false })
  icon?: string = 'mdi-calendar';

  /**
   * Color used for displaying the person department (default: #4CAF50).
   */
  @ApiProperty()
  @Sapling(['isColor'])
  @SaplingForm({
    order: 200,
    group: 'personDepartment.groupAppearance',
    groupOrder: 200,
    width: 1,
  })
  @Property({ default: '#4CAF50', length: 32, nullable: false })
  color!: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Persons belonging to this department.
   */
  @ApiPropertyOptional({ type: () => PersonItem, isArray: true })
  @OneToMany(() => PersonItem, (person) => person.department)
  persons: Collection<PersonItem> = new Collection<PersonItem>(this);
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the person department was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the person department was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  //#endregion
}
