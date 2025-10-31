import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { LanguageItem } from './LanguageItem';

@Entity()
export class TranslationItem {
  //#region Properties: Persisted
  /**
   * Entity name to which this translation belongs (e.g., 'Ticket', 'Note').
   */
  @PrimaryKey({ length: 64 })
  entity!: string;

  /**
   * Property name of the entity being translated (e.g., 'description').
   */
  @PrimaryKey({ length: 64 })
  property: string;

  /**
   * Translated value for the property.
   */
  @Property({ length: 1024, nullable: false })
  value: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Language for this translation.
   */
  @ManyToOne(() => LanguageItem, { primary: true })
  language!: LanguageItem;
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the translation was created.
   */
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the translation was last updated.
   */
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
