import { type Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntityItem } from './EntityItem';
import { InboxSubscriptionItem } from './InboxSubscriptionItem';
import { InboxTemplateItem } from './InboxTemplateItem';
import { PersonItem } from './PersonItem';
import {
  Sapling,
  SaplingForm,
  SaplingGenericReference,
} from './global/entity.decorator';

@Entity()
export class InboxNotificationItem {
  @ApiProperty()
  @Sapling(['isOrderASC'])
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty({ type: () => EntityItem })
  @Sapling(['isEntity'])
  @SaplingForm({
    order: 100,
    group: 'inboxNotification.groupReference',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @ManyToOne(() => EntityItem, { nullable: false })
  entity!: Rel<EntityItem>;

  @ApiProperty({ type: () => InboxSubscriptionItem })
  @SaplingForm({
    order: 200,
    group: 'inboxNotification.groupReference',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @ManyToOne(() => InboxSubscriptionItem, { nullable: false })
  subscription!: Rel<InboxSubscriptionItem>;

  @ApiPropertyOptional({ type: () => InboxTemplateItem })
  @SaplingForm({
    order: 300,
    group: 'inboxNotification.groupReference',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @ManyToOne(() => InboxTemplateItem, { nullable: true })
  template?: Rel<InboxTemplateItem>;

  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson'])
  @SaplingForm({
    order: 400,
    group: 'inboxNotification.groupReference',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 400,
    tableVisible: true,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @ManyToOne(() => PersonItem, { nullable: false })
  recipientPerson!: Rel<PersonItem>;

  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson'])
  @SaplingForm({
    order: 500,
    group: 'inboxNotification.groupReference',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 500,
    tableVisible: true,
    mobileOrder: 500,
    mobileVisible: false,
  })
  @ManyToOne(() => PersonItem, { nullable: false })
  createdBy!: Rel<PersonItem>;

  @ApiPropertyOptional()
  @Sapling(['isSystem', 'isValue'])
  @SaplingGenericReference({
    entityField: 'entity',
    handleField: 'referenceHandle',
  })
  @SaplingForm({
    order: 100,
    group: 'inboxNotification.groupContent',
    groupOrder: 100,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ nullable: true, length: 64 })
  referenceHandle?: string | null;

  @ApiProperty()
  @Sapling(['isValue'])
  @SaplingForm({
    order: 200,
    group: 'inboxNotification.groupContent',
    groupOrder: 100,
    width: 4,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: true,
  })
  @Property({ nullable: false, length: 256 })
  title!: string;

  @ApiProperty()
  @Sapling(['isMarkdown'])
  @SaplingForm({
    order: 300,
    group: 'inboxNotification.groupContent',
    groupOrder: 100,
    width: 4,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ nullable: false, length: 8192 })
  bodyMarkdown!: string;

  @ApiProperty()
  @SaplingForm({
    order: 400,
    group: 'inboxNotification.groupContent',
    groupOrder: 100,
    width: 4,
    visible: true,
    tableOrder: 400,
    tableVisible: true,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @Property({ nullable: false, length: 8192 })
  bodyText!: string;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 500,
    group: 'inboxNotification.groupContent',
    groupOrder: 100,
    width: 4,
    visible: true,
    tableOrder: 500,
    tableVisible: true,
    mobileOrder: 500,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  requestPayload?: object | null;

  @ApiPropertyOptional({ default: false })
  @SaplingForm({
    order: 100,
    group: 'inboxNotification.groupConfiguration',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ default: false, nullable: false })
  isRead: boolean = false;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @SaplingForm({
    order: 200,
    group: 'inboxNotification.groupConfiguration',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ nullable: true, type: 'datetime' })
  readAt?: Date | null;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
