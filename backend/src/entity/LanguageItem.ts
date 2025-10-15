import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { TranslationItem } from './TranslationItem';
import { PersonItem } from './PersonItem';

@Entity()
export class LanguageItem {
  @PrimaryKey({ length: 64 })
  handle!: string;

  @Property({ unique: true, length: 64, nullable: false })
  name: string;

  // Relations
  @OneToMany(() => TranslationItem, (x) => x.language)
  translations = new Collection<TranslationItem>(this);

  @OneToMany(() => PersonItem, (x) => x.language)
  persons = new Collection<PersonItem>(this);

  // System
  @Property({ nullable: true, type: 'datetime' })
  createdAt: Date | null = new Date();

  @Property({ nullable: true, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date | null;
}
