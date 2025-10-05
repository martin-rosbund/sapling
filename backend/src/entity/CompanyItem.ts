import { Collection, Entity, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';
import { PersonItem } from './PersonItem';

@Entity()
export class CompanyItem {
    @PrimaryKey({ autoincrement: true })
    handle!: number | null;

    @Property({ unique: true })
    name: string;

    @Property()
    street: string;

    @Property()
    zip: string;

    @Property()
    city: string;

    @Property()
    phone: string;

    @Property()
    email: string;

    @Property()
    website: string;

    @Property({ default: true })
    isActive: boolean | null;

    @Property({ default: false })
    requirePasswordChange: boolean | null;

    @OneToMany(() => PersonItem, (x) => x.company)
    persons = new Collection<PersonItem>(this);
}