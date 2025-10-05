import { Collection, Entity, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';
import { TranslationItem } from './TranslationItem';
import { PersonItem } from './PersonItem';

@Entity()
export class LanguageItem {
  @PrimaryKey()
  handle!: string;

  @Property({ unique: true })
  name: string;

  @OneToMany(() => TranslationItem, (x) => x.language)
  translations = new Collection<TranslationItem>(this);

  @OneToMany(() => PersonItem, (x) => x.language)
  persons = new Collection<PersonItem>(this);
}