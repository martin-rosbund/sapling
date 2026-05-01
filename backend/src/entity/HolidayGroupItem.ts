import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HolidayItem } from './HolidayItem';
import { PersonItem } from './PersonItem';
import { CompanyItem } from './CompanyItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

@Entity()
export class HolidayGroupItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'holidayGroup.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 128, nullable: false })
  title!: string;

  @ApiPropertyOptional({ type: () => HolidayItem, isArray: true })
  @OneToMany(() => HolidayItem, (holiday) => holiday.group)
  holidays: Collection<HolidayItem> = new Collection<HolidayItem>(this);

  @ApiPropertyOptional({ type: () => PersonItem, isArray: true })
  @OneToMany(() => PersonItem, (person) => person.holidayGroup)
  persons: Collection<PersonItem> = new Collection<PersonItem>(this);

  @ApiPropertyOptional({ type: () => CompanyItem, isArray: true })
  @OneToMany(() => CompanyItem, (company) => company.holidayGroup)
  companies: Collection<CompanyItem> = new Collection<CompanyItem>(this);

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
