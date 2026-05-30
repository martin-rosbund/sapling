import { Collection, type Rel } from '@mikro-orm/core';
import {
  Entity,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntityItem } from './EntityItem';
import {
  Sapling,
  SaplingDependsOn,
  SaplingForm,
} from './global/entity.decorator';
import { InboxTemplateItem } from './InboxTemplateItem';
import { InboxNotificationItem } from './InboxNotificationItem';
import { WebhookSubscriptionTypeItem } from './WebhookSubscriptionTypeItem';

@Entity()
export class InboxSubscriptionItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiPropertyOptional({ type: () => InboxNotificationItem, isArray: true })
  @OneToMany(
    () => InboxNotificationItem,
    (notification) => notification.subscription,
  )
  notifications: Collection<InboxNotificationItem> =
    new Collection<InboxNotificationItem>(this);

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'inboxSubscription.groupContent',
    groupOrder: 100,
    width: 4,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ length: 128, nullable: false })
  description!: string;

  @ApiProperty()
  @SaplingForm({
    order: 200,
    group: 'inboxSubscription.groupContent',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ length: 64, nullable: false })
  recipientField!: string;

  @ApiPropertyOptional({ default: true })
  @SaplingForm({
    order: 100,
    group: 'inboxSubscription.groupConfiguration',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ default: true, nullable: false })
  isActive: boolean = true;

  @ApiProperty({ type: () => EntityItem })
  @Sapling(['isEntity'])
  @SaplingForm({
    order: 100,
    group: 'inboxSubscription.groupContent',
    groupOrder: 150,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @ManyToOne(() => EntityItem, { nullable: false })
  entity!: Rel<EntityItem>;

  @ApiProperty({ type: () => WebhookSubscriptionTypeItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 200,
    group: 'inboxSubscription.groupReference',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @ManyToOne(() => WebhookSubscriptionTypeItem, {
    defaultRaw: `'afterInsert'`,
    nullable: false,
  })
  type!: Rel<WebhookSubscriptionTypeItem>;

  @ApiProperty({ type: () => InboxTemplateItem })
  @SaplingDependsOn({
    parentField: 'entity',
    targetField: 'entity',
    requireParent: true,
    clearOnParentChange: true,
  })
  @SaplingForm({
    order: 300,
    group: 'inboxSubscription.groupReference',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @ManyToOne(() => InboxTemplateItem, { nullable: false })
  template!: Rel<InboxTemplateItem>;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
