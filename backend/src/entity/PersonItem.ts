import { Collection, Entity, ManyToOne, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';
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

    @Property()
    loginPassword: string;

    @Property()
    phone: string;

    @Property()
    mobile: string;

    @Property()
    email: string;

    @Property()
    birthDay: Date;

    @Property()
    requirePasswordChange: boolean;

    @Property()
    isActive: boolean;
    
    @ManyToOne(() => CompanyItem)
    company!: CompanyItem;

    @ManyToOne(() => LanguageItem)
    language!: LanguageItem;
}