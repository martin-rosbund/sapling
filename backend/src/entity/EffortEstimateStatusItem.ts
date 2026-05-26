import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EffortEstimateItem } from './EffortEstimateItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

@Entity()
export class EffortEstimateStatusItem {
  @ApiProperty()
  @Property({ primary: true, length: 64 })
  handle!: string;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'effortEstimateStatus.groupContent',
    groupOrder: 100,
    width: 4,
  })
  @Property({ length: 64, nullable: false })
  description!: string;

  @ApiProperty()
  @Sapling(['isColor'])
  @SaplingForm({
    order: 100,
    group: 'effortEstimateStatus.groupAppearance',
    groupOrder: 200,
    width: 1,
  })
  @Property({ length: 16, nullable: false })
  color!: string;

  @ApiPropertyOptional({ default: 'mdi-new-box' })
  @Sapling(['isIcon'])
  @SaplingForm({
    order: 200,
    group: 'effortEstimateStatus.groupAppearance',
    groupOrder: 200,
    width: 1,
  })
  @Property({ default: 'mdi-new-box', length: 64, nullable: false })
  icon?: string = 'mdi-new-box';

  @ApiPropertyOptional({ type: () => EffortEstimateItem, isArray: true })
  @OneToMany(() => EffortEstimateItem, (estimate) => estimate.status)
  effortEstimates: Collection<EffortEstimateItem> =
    new Collection<EffortEstimateItem>(this);

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
