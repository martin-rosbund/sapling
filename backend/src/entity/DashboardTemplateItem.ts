import { Collection, type Rel } from '@mikro-orm/core';
import {
  Entity,
  ManyToMany,
  ManyToOne,
  Property,
} from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KpiItem } from './KpiItem';
import { PersonItem } from './PersonItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

/**
 * Persisted dashboard template configuration that can either be shared globally
 * or remain private to the creating user.
 */
@Entity()
export class DashboardTemplateItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'dashboardTemplate.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 128, nullable: false })
  name!: string;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 100,
    group: 'dashboardTemplate.groupContent',
    groupOrder: 200,
    width: 4,
  })
  @Property({ length: 512, nullable: true })
  description?: string;

  @ApiProperty()
  @SaplingForm({
    order: 200,
    group: 'dashboardTemplate.groupBasics',
    groupOrder: 100,
    width: 1,
  })
  @Property({ default: false, nullable: false })
  isShared = false;

  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson', 'isCurrentPerson', 'isReadOnly'])
  @SaplingForm({
    order: 100,
    group: 'dashboardTemplate.groupReference',
    groupOrder: 300,
    width: 2,
  })
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: Rel<PersonItem>;

  @ApiPropertyOptional({ type: () => KpiItem, isArray: true })
  @ManyToMany(() => KpiItem, undefined, { owner: true })
  kpis: Collection<KpiItem> = new Collection<KpiItem>(this);

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
