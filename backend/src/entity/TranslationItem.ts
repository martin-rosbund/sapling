import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { LanguageItem } from './LanguageItem';

@Entity()
export class TranslationItem {
  @PrimaryKey({ length: 64 })
  entity!: string;

  @PrimaryKey({ length: 64 })
  property: string;

  @Property({ length: 1024 })
  value: string;

  // Relations
  @ManyToOne(() => LanguageItem, { primary: true })
  language!: LanguageItem;

  // System
  @Property({ nullable: true })
  createdAt: Date | null = new Date();

  @Property({ nullable: true, onUpdate: () => new Date() })
  updatedAt?: Date | null;
}
