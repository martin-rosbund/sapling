import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type Rel } from '@mikro-orm/core';
import { EmailDeliveryStatusItem } from './EmailDeliveryStatusItem';
import { EmailTemplateItem } from './EmailTemplateItem';
import { EntityItem } from './EntityItem';
import { PersonItem } from './PersonItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

@Entity()
export class EmailDeliveryItem {
  @ApiPropertyOptional({
    type: () => EmailDeliveryStatusItem,
    default: 'pending',
  })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 100,
    group: 'emailDelivery.groupReference',
    groupOrder: 100,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @ManyToOne(() => EmailDeliveryStatusItem, {
    defaultRaw: `'pending'`,
    nullable: true,
  })
  status?: Rel<EmailDeliveryStatusItem>;

  @ApiPropertyOptional({ type: () => EmailTemplateItem })
  @SaplingForm({
    order: 100,
    group: 'emailDelivery.groupContent',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 100,
    tableVisible: false,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @ManyToOne(() => EmailTemplateItem, { nullable: true })
  template?: Rel<EmailTemplateItem>;

  @ApiProperty({ type: () => EntityItem })
  @Sapling(['isEntity'])
  @SaplingForm({
    order: 200,
    group: 'emailDelivery.groupReference',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @ManyToOne(() => EntityItem, { nullable: false })
  entity!: Rel<EntityItem>;

  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson'])
  @SaplingForm({
    order: 300,
    group: 'emailDelivery.groupReference',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 300,
    tableVisible: false,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @ManyToOne(() => PersonItem, { nullable: false })
  createdBy!: Rel<PersonItem>;

  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 100,
    group: 'emailDelivery.groupBasics',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ nullable: true, length: 64 })
  referenceHandle?: string;

  @ApiProperty()
  @Sapling(['isChip'])
  @SaplingForm({
    order: 100,
    group: 'emailDelivery.groupIntegration',
    groupOrder: 400,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ length: 32, nullable: false })
  provider!: string;

  @ApiProperty({ type: [String] })
  @SaplingForm({
    order: 200,
    group: 'emailDelivery.groupBasics',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: false,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: false })
  toRecipients!: string[];

  @ApiPropertyOptional({ type: [String] })
  @SaplingForm({
    order: 300,
    group: 'emailDelivery.groupBasics',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 300,
    tableVisible: false,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  ccRecipients?: string[];

  @ApiPropertyOptional({ type: [String] })
  @SaplingForm({
    order: 400,
    group: 'emailDelivery.groupBasics',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 400,
    tableVisible: false,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  bccRecipients?: string[];

  @ApiProperty()
  @SaplingForm({
    order: 500,
    group: 'emailDelivery.groupBasics',
    groupOrder: 300,
    width: 4,
    visible: true,
    tableOrder: 500,
    tableVisible: true,
    mobileOrder: 500,
    mobileVisible: false,
  })
  @Property({ length: 256, nullable: false })
  subject!: string;

  @ApiProperty()
  @Sapling(['isMarkdown'])
  @SaplingForm({
    order: 200,
    group: 'emailDelivery.groupContent',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 200,
    tableVisible: false,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ nullable: false, length: 8192 })
  bodyMarkdown!: string;

  @ApiProperty()
  @SaplingForm({
    order: 300,
    group: 'emailDelivery.groupContent',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 300,
    tableVisible: false,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ nullable: false, length: 16384 })
  bodyHtml!: string;

  @ApiPropertyOptional({ type: [Number] })
  @SaplingForm({
    order: 600,
    group: 'emailDelivery.groupBasics',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 600,
    tableVisible: false,
    mobileOrder: 600,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  attachmentHandles?: number[];

  @ApiPropertyOptional()
  @SaplingForm({
    order: 400,
    group: 'emailDelivery.groupContent',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 400,
    tableVisible: false,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  requestPayload?: object;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 700,
    group: 'emailDelivery.groupBasics',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 700,
    tableVisible: true,
    mobileOrder: 700,
    mobileVisible: false,
  })
  @Property({ nullable: true })
  responseStatusCode?: number;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 500,
    group: 'emailDelivery.groupContent',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 500,
    tableVisible: false,
    mobileOrder: 500,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  responseBody?: object;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 550,
    group: 'emailDelivery.groupContent',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 550,
    tableVisible: false,
    mobileOrder: 550,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  responseHeaders?: object;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 600,
    group: 'emailDelivery.groupContent',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 600,
    tableVisible: false,
    mobileOrder: 600,
    mobileVisible: false,
  })
  @Property({ nullable: true, length: 256 })
  providerMessageId?: string;

  @ApiProperty({ type: 'string', format: 'date-time' })
  @SaplingForm({
    order: 100,
    group: 'emailDelivery.groupSchedule',
    groupOrder: 500,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ nullable: true, type: 'datetime' })
  completedAt?: Date;

  @ApiPropertyOptional({ default: 0 })
  @SaplingForm({
    order: 800,
    group: 'emailDelivery.groupBasics',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 800,
    tableVisible: true,
    mobileOrder: 800,
    mobileVisible: false,
  })
  @Property({ default: 0, nullable: false })
  attemptCount!: number;

  @ApiProperty({ type: 'string', format: 'date-time' })
  @SaplingForm({
    order: 200,
    group: 'emailDelivery.groupSchedule',
    groupOrder: 500,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ nullable: true, type: 'datetime' })
  nextRetryAt?: Date;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
