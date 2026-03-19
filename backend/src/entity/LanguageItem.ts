import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { TranslationItem } from './TranslationItem';
import { PersonItem } from './PersonItem';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';
import { CountryItem } from './CountryItem';

/**
 * @class LanguageItem
 * @version 1.0
 * @author Martin Rosbund
 * @summary Entity representing a language.
 * @description Contains language details and relations to translations, persons, and countries. Used to manage supported languages in the system.
 *
 * @property {string} handle - Unique identifier for the language (primary key).
 * @property {string} name - Name of the language (must be unique).
 * @property {Collection<CountryItem>} countries - Countries that use this language as their primary language.
 * @property {Collection<TranslationItem>} translations - Translations associated with this language.
 * @property {Collection<PersonItem>} persons - Persons using this language as their preference.
 * @property {Date} createdAt - Date and time when the language was created.
 * @property {Date} updatedAt - Date and time when the language was last updated.
 */
@Entity()
export class LanguageItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the language (primary key).
   */
  @ApiProperty()
  @PrimaryKey({ length: 64 })
  handle!: string;

  /**
   * Name of the language (must be unique).
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ unique: true, length: 64, nullable: false })
  name: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Countries that use this language as their primary language.
   */
  @ApiPropertyOptional({ type: () => CountryItem, isArray: true })
  @OneToMany(() => CountryItem, (x) => x.language)
  countries = new Collection<CountryItem>(this);

  /**
   * Translations associated with this language.
   */
  @ApiPropertyOptional({ type: () => TranslationItem, isArray: true })
  @OneToMany(() => TranslationItem, (x) => x.language)
  translations = new Collection<TranslationItem>(this);

  /**
   * Persons using this language as their preference.
   */
  @ApiPropertyOptional({ type: () => PersonItem, isArray: true })
  @OneToMany(() => PersonItem, (x) => x.language)
  persons = new Collection<PersonItem>(this);
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
