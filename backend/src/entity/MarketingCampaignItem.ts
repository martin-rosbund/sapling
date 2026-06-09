import { type Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { EMailListItem } from './EMailListItem';
import { EmailTemplateItem } from './EmailTemplateItem';
import { MarketingCampaignStatusItem } from './MarketingCampaignStatusItem';
import { MarketingCampaignTypeItem } from './MarketingCampaignTypeItem';
import { PersonItem } from './PersonItem';
import { SalesOpportunitySourceItem } from './SalesOpportunitySourceItem';

@Entity()
export class MarketingCampaignItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC', 'isDuplicateCheck'])
  @SaplingForm({
    order: 100,
    group: 'marketingCampaign.groupBasics',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ length: 128, nullable: false })
  name!: string;

  @ApiPropertyOptional()
  @Sapling(['isMarkdown'])
  @SaplingForm({
    order: 100,
    group: 'marketingCampaign.groupContent',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ nullable: true, type: 'text' })
  description?: string;

  @ApiPropertyOptional({ type: 'string', format: 'date' })
  @Sapling(['isToday', 'isDateStart'])
  @SaplingForm({
    order: 100,
    group: 'marketingCampaign.groupSchedule',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ nullable: true, type: 'date' })
  startDate?: Date;

  @ApiPropertyOptional({ type: 'string', format: 'date' })
  @Sapling(['isDeadline', 'isDateEnd'])
  @SaplingForm({
    order: 200,
    group: 'marketingCampaign.groupSchedule',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ nullable: true, type: 'date' })
  endDate?: Date;

  @ApiPropertyOptional({ default: true })
  @SaplingForm({
    order: 100,
    group: 'marketingCampaign.groupConfiguration',
    groupOrder: 400,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ default: true, nullable: false })
  isActive: boolean = true;

  @ApiPropertyOptional({ type: () => MarketingCampaignStatusItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 200,
    group: 'marketingCampaign.groupBasics',
    groupOrder: 100,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @ManyToOne(() => MarketingCampaignStatusItem, {
    defaultRaw: `'planned'`,
    nullable: false,
  })
  status!: Rel<MarketingCampaignStatusItem>;

  @ApiPropertyOptional({ type: () => MarketingCampaignTypeItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 300,
    group: 'marketingCampaign.groupBasics',
    groupOrder: 100,
    width: 1,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @ManyToOne(() => MarketingCampaignTypeItem, {
    defaultRaw: `'newsletter'`,
    nullable: false,
  })
  type!: Rel<MarketingCampaignTypeItem>;

  @ApiPropertyOptional({ type: () => EMailListItem })
  @SaplingForm({
    order: 100,
    group: 'marketingCampaign.groupReference',
    groupOrder: 500,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @ManyToOne(() => EMailListItem, { nullable: true })
  targetList?: Rel<EMailListItem>;

  @ApiPropertyOptional({ type: () => EmailTemplateItem })
  @SaplingForm({
    order: 200,
    group: 'marketingCampaign.groupReference',
    groupOrder: 500,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @ManyToOne(() => EmailTemplateItem, { nullable: true })
  emailTemplate?: Rel<EmailTemplateItem>;

  @ApiPropertyOptional({ type: () => PersonItem })
  @Sapling(['isPerson', 'isPartner', 'isCurrentPerson'])
  @SaplingForm({
    order: 300,
    group: 'marketingCampaign.groupReference',
    groupOrder: 500,
    width: 2,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @ManyToOne(() => PersonItem, { nullable: true })
  ownerPerson?: Rel<PersonItem>;

  @ApiPropertyOptional({ type: () => SalesOpportunitySourceItem })
  @SaplingForm({
    order: 400,
    group: 'marketingCampaign.groupReference',
    groupOrder: 500,
    width: 2,
    visible: true,
    tableOrder: 400,
    tableVisible: true,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @ManyToOne(() => SalesOpportunitySourceItem, { nullable: true })
  opportunitySource?: Rel<SalesOpportunitySourceItem>;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
