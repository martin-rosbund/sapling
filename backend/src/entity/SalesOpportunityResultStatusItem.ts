import { Entity, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';

@Entity()
export class SalesOpportunityResultStatusItem {
  @ApiProperty()
  @Sapling(['isOrderASC'])
  @Property({ primary: true, length: 64 })
  handle!: string;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'salesOpportunityResultStatus.groupBasics',
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

  @ApiPropertyOptional({ default: false })
  @SaplingForm({
    order: 100,
    group: 'salesOpportunityResultStatus.groupConfiguration',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ default: false, nullable: false })
  isClosed?: boolean = false;

  @ApiPropertyOptional({ default: false })
  @SaplingForm({
    order: 200,
    group: 'salesOpportunityResultStatus.groupConfiguration',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ default: false, nullable: false })
  isSuccess?: boolean = false;

  @ApiPropertyOptional({ default: true })
  @SaplingForm({
    order: 250,
    group: 'salesOpportunityResultStatus.groupConfiguration',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 250,
    tableVisible: true,
    mobileOrder: 250,
    mobileVisible: false,
  })
  @Property({ default: true, nullable: false })
  isOpen?: boolean = true;

  @ApiPropertyOptional({ default: 'mdi-circle-outline' })
  @Sapling(['isIcon'])
  @SaplingForm({
    order: 300,
    group: 'salesOpportunityResultStatus.groupAppearance',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ default: 'mdi-circle-outline', length: 64, nullable: false })
  icon?: string = 'mdi-circle-outline';

  @ApiPropertyOptional({ default: '#546E7A' })
  @Sapling(['isColor'])
  @SaplingForm({
    order: 400,
    group: 'salesOpportunityResultStatus.groupAppearance',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 400,
    tableVisible: true,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @Property({ default: '#546E7A', length: 32, nullable: false })
  color!: string;

  @ApiPropertyOptional({ default: 0 })
  @Sapling(['isOrderASC'])
  @SaplingForm({
    order: 500,
    group: 'salesOpportunityResultStatus.groupConfiguration',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 500,
    tableVisible: true,
    mobileOrder: 500,
    mobileVisible: false,
  })
  @Property({ default: 0, nullable: false })
  sortOrder?: number = 0;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
