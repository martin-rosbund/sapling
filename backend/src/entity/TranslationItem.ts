import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  Unique,
} from '@mikro-orm/core';
import { LanguageItem } from './LanguageItem';
import { ApiProperty } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a translation for an entity property, including persisted properties, relations, and system fields.
 *
 * @property        {string}        entity        Entity name to which this translation belongs (primary key)
 * @property        {string}        property      Property name of the entity being translated (primary key)
 * @property        {string}        value         Translated value for the property
 * @property        {LanguageItem}  language      Language for this translation
 * @property        {Date}          createdAt     Date and time when the translation was created
 * @property        {Date}          updatedAt     Date and time when the translation was last updated
 */
@Entity()
@Unique({ properties: ['entity', 'property', 'language'] })
export class TranslationItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the translation (primary key).
   * @type {number}
   */
  @ApiProperty()
  @PrimaryKey({ autoincrement: true })
  handle?: number;

  /**
   * Entity name to which this translation belongs (e.g., 'Ticket', 'Note').
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 64 })
  entity!: string;

  /**
   * Property name of the entity being translated (e.g., 'description').
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact'])
  @Property({ length: 64 })
  property: string;

  /**
   * Translated value for the property.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact'])
  @Property({ length: 1024, nullable: false })
  value: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Language for this translation.
   * @type {LanguageItem}
   */
  @ApiProperty({ type: () => LanguageItem })
  @ManyToOne(() => LanguageItem, { nullable: false })
  language!: LanguageItem;
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the translation was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the translation was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  //#endregion
}
