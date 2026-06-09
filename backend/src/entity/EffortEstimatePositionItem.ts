import { type Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EffortEstimateItem } from './EffortEstimateItem';
import { EffortEstimatePositionTemplateItem } from './EffortEstimatePositionTemplateItem';
import {
  Sapling,
  SaplingForm,
  SaplingReferenceTemplate,
} from './global/entity.decorator';

@Entity()
export class EffortEstimatePositionItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC', 'isDuplicateCheck'])
  @SaplingForm({
    order: 100,
    group: 'effortEstimatePosition.groupBasics',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ length: 128, nullable: false })
  title!: string;

  @ApiPropertyOptional({ type: 'number' })
  @Sapling(['isNumeric'])
  @SaplingForm({
    order: 200,
    group: 'effortEstimatePosition.groupBasics',
    groupOrder: 100,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ nullable: true, type: 'float' })
  estimatedHours?: number;

  @ApiPropertyOptional()
  @Sapling(['isMarkdown'])
  @SaplingForm({
    order: 100,
    group: 'effortEstimatePosition.groupContent',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 100,
    tableVisible: false,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ nullable: true, type: 'text' })
  offerTextMarkdown?: string;

  @ApiPropertyOptional({ type: 'number' })
  @SaplingForm({
    order: 100,
    group: 'effortEstimatePosition.groupConfiguration',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ default: 100, nullable: false })
  sortOrder = 100;

  @ApiPropertyOptional({ default: false })
  @SaplingForm({
    order: 200,
    group: 'effortEstimatePosition.groupConfiguration',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ default: false, nullable: false })
  isOptional = false;

  @ApiProperty({ type: () => EffortEstimateItem })
  @SaplingForm({
    order: 100,
    group: 'effortEstimatePosition.groupReference',
    groupOrder: 400,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @ManyToOne(() => EffortEstimateItem, { nullable: false })
  estimate!: Rel<EffortEstimateItem>;

  @ApiPropertyOptional({ type: () => EffortEstimatePositionTemplateItem })
  @SaplingReferenceTemplate([
    {
      sourceField: 'offerTextMarkdown',
      targetField: 'offerTextMarkdown',
    },
    {
      sourceField: 'estimatedHours',
      targetField: 'estimatedHours',
      overwrite: false,
    },
  ])
  @SaplingForm({
    order: 200,
    group: 'effortEstimatePosition.groupReference',
    groupOrder: 400,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @ManyToOne(() => EffortEstimatePositionTemplateItem, { nullable: true })
  template?: Rel<EffortEstimatePositionTemplateItem>;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
