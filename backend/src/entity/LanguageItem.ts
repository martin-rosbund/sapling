import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { TranslationItem } from './TranslationItem';
import { PersonItem } from './PersonItem';

/**
 * Entity representing a language.
 * Contains language details and relations to translations and persons.
 */
@Entity()
export class LanguageItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the language (primary key).
   */
  @PrimaryKey({ length: 64 })
  handle!: string;

  /**
   * Name of the language (must be unique).
   */
  @Property({ unique: true, length: 64, nullable: false })
  name: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Translations associated with this language.
   */
  @OneToMany(() => TranslationItem, (x) => x.language)
  translations = new Collection<TranslationItem>(this);

  /**
   * Persons using this language as their preference.
   */
  @OneToMany(() => PersonItem, (x) => x.language)
  persons = new Collection<PersonItem>(this);
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the language was created.
   */
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the language was last updated.
   */
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
