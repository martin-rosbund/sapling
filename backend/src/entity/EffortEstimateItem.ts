import { Collection, type Rel } from '@mikro-orm/core';
import {
  Entity,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompanyItem } from './CompanyItem';
import { PersonItem } from './PersonItem';
import { SalesOpportunityItem } from './SalesOpportunityItem';
import { TicketItem } from './TicketItem';
import { EffortEstimatePositionItem } from './EffortEstimatePositionItem';
import { EffortEstimateStatusItem } from './EffortEstimateStatusItem';
import {
  Sapling,
  SaplingDependsOn,
  SaplingForm,
} from './global/entity.decorator';

@Entity()
export class EffortEstimateItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC', 'isDuplicateCheck'])
  @SaplingForm({
    order: 100,
    group: 'effortEstimate.groupBasics',
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

  @ApiProperty({ type: () => EffortEstimateStatusItem, default: 'new' })
  @Sapling(['isChip', 'isValue'])
  @SaplingForm({
    order: 200,
    group: 'effortEstimate.groupBasics',
    groupOrder: 100,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: true,
  })
  @ManyToOne(() => EffortEstimateStatusItem, {
    default: 'new',
    nullable: false,
  })
  status!: Rel<EffortEstimateStatusItem>;

  @ApiPropertyOptional({ type: 'string', format: 'date' })
  @Sapling(['isOrderASC', 'isDeadline'])
  @SaplingForm({
    order: 100,
    group: 'effortEstimate.groupSchedule',
    groupOrder: 250,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ nullable: true, type: 'date' })
  expectedCompletionDate?: Date;

  @ApiPropertyOptional()
  @Sapling(['isMarkdown'])
  @SaplingForm({
    order: 100,
    group: 'effortEstimate.groupContent',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 100,
    tableVisible: false,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ nullable: true, type: 'text' })
  requirementsMarkdown?: string;

  @ApiPropertyOptional({ default: true })
  @SaplingForm({
    order: 100,
    group: 'effortEstimate.groupConfiguration',
    groupOrder: 500,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ default: true, nullable: false })
  isActive = true;

  @ApiPropertyOptional({ type: 'number' })
  @Sapling(['isReadOnly'])
  @Property({ persist: false, nullable: true, type: 'float' })
  get totalEstimatedHours(): number {
    if (!this.positions?.isInitialized()) {
      return 0;
    }

    return this.positions
      .getItems()
      .reduce((sum, position) => sum + (position.estimatedHours ?? 0), 0);
  }

  @ApiPropertyOptional({ type: () => CompanyItem })
  @Sapling(['isCompany', 'isCurrentCompany', 'isValue'])
  @SaplingForm({
    order: 100,
    group: 'effortEstimate.groupReference',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @ManyToOne(() => CompanyItem, { nullable: true })
  assigneeCompany?: Rel<CompanyItem>;

  @ApiPropertyOptional({ type: () => PersonItem })
  @Sapling(['isPerson', 'isPartner', 'isCurrentPerson'])
  @SaplingDependsOn({
    parentField: 'assigneeCompany',
    targetField: 'company',
    requireParent: true,
    clearOnParentChange: true,
  })
  @SaplingForm({
    order: 200,
    group: 'effortEstimate.groupReference',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @ManyToOne(() => PersonItem, { nullable: true })
  assigneePerson?: Rel<PersonItem>;

  @ApiPropertyOptional({ type: () => CompanyItem })
  @Sapling(['isCompany', 'isCurrentCompany'])
  @SaplingForm({
    order: 300,
    group: 'effortEstimate.groupReference',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 300,
    tableVisible: false,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @ManyToOne(() => CompanyItem, { nullable: true })
  creatorCompany?: Rel<CompanyItem>;

  @ApiPropertyOptional({ type: () => PersonItem })
  @Sapling(['isPerson', 'isPartner', 'isCurrentPerson'])
  @SaplingDependsOn({
    parentField: 'creatorCompany',
    targetField: 'company',
    requireParent: true,
    clearOnParentChange: true,
  })
  @SaplingForm({
    order: 400,
    group: 'effortEstimate.groupReference',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 400,
    tableVisible: false,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @ManyToOne(() => PersonItem, { nullable: true })
  creatorPerson?: Rel<PersonItem>;

  @ApiPropertyOptional({ type: () => SalesOpportunityItem })
  @SaplingForm({
    order: 500,
    group: 'effortEstimate.groupReference',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 500,
    tableVisible: false,
    mobileOrder: 500,
    mobileVisible: false,
  })
  @ManyToOne(() => SalesOpportunityItem, { nullable: true })
  salesOpportunity?: Rel<SalesOpportunityItem>;

  @ApiPropertyOptional({ type: () => TicketItem })
  @SaplingForm({
    order: 600,
    group: 'effortEstimate.groupReference',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 600,
    tableVisible: false,
    mobileOrder: 600,
    mobileVisible: false,
  })
  @ManyToOne(() => TicketItem, { nullable: true })
  ticket?: Rel<TicketItem>;

  @ApiPropertyOptional({
    type: () => EffortEstimatePositionItem,
    isArray: true,
  })
  @OneToMany(() => EffortEstimatePositionItem, (position) => position.estimate)
  positions: Collection<EffortEstimatePositionItem> =
    new Collection<EffortEstimatePositionItem>(this);

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
