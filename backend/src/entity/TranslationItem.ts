import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { LanguageItem } from './LanguageItem';

@Entity()
export class TranslationItem {
  @PrimaryKey({ length: 64 })
  entity!: string;

  @PrimaryKey({ length: 64 })
  property: string;

  @Property({ length: 1024, nullable: false })
  value: string;

  // Relations
  @ManyToOne(() => LanguageItem, { primary: true })
  language!: LanguageItem;

  // System
  @Property({ nullable: false, type: 'datetime' })
  createdAt: Date | null = new Date();

  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
}
