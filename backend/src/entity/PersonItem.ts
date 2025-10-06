import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { CompanyItem } from './CompanyItem';
import { LanguageItem } from './LanguageItem';

@Entity()
export class PersonItem {
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  @Property()
  firstName: string;

  @Property()
  lastName: string;

  @Property({ unique: true })
  loginName: string;

  @Property({ nullable: true })
  loginPassword: string | null;

  @Property({ nullable: true })
  phone: string | null;

  @Property({ nullable: true })
  mobile: string | null;

  @Property({ nullable: true })
  email: string | null;

  @Property({ nullable: true })
  birthDay: Date | null;

  @Property({ default: false })
  requirePasswordChange: boolean | null = false;

  @Property({ default: true })
  isActive: boolean | null = true;

  @ManyToOne(() => CompanyItem, { nullable: true })
  company!: CompanyItem | null;

  @ManyToOne(() => LanguageItem, { nullable: true })
  language!: LanguageItem | null;
}
