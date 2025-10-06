import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { LanguageItem } from './LanguageItem';

@Entity()
export class TranslationItem {
  @PrimaryKey()
  entity!: string;

  @PrimaryKey()
  property: string;

  @Property()
  value: string;

  @ManyToOne(() => LanguageItem, { primary: true })
  language!: LanguageItem;
}
