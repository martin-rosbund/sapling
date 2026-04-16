import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type Rel } from '@mikro-orm/core';
import { EmailDeliveryStatusItem } from './EmailDeliveryStatusItem';
import { EmailTemplateItem } from './EmailTemplateItem';
import { EntityItem } from './EntityItem';
import { PersonItem } from './PersonItem';
import { Sapling } from './global/entity.decorator';

@Entity()
export class EmailDeliveryItem {
  @ApiPropertyOptional({
    type: () => EmailDeliveryStatusItem,
    default: 'pending',
  })
  @Sapling(['isChip'])
  @ManyToOne(() => EmailDeliveryStatusItem, {
    defaultRaw: `'pending'`,
    nullable: true,
  })
  status?: Rel<EmailDeliveryStatusItem>;

  @ApiPropertyOptional({ type: () => EmailTemplateItem })
  @ManyToOne(() => EmailTemplateItem, { nullable: true })
  template?: Rel<EmailTemplateItem>;

  @ApiProperty({ type: () => EntityItem })
  @Sapling(['isEntity'])
  @ManyToOne(() => EntityItem, { nullable: false })
  entity!: Rel<EntityItem>;

  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson'])
  @ManyToOne(() => PersonItem, { nullable: false })
  createdBy!: Rel<PersonItem>;

  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiPropertyOptional()
  @Property({ nullable: true, length: 64 })
  referenceHandle?: string;

  @ApiProperty()
  @Sapling(['isChip'])
  @Property({ length: 32, nullable: false })
  provider!: string;

  @ApiProperty({ type: [String] })
  @Property({ type: 'json', nullable: false })
  toRecipients!: string[];

  @ApiPropertyOptional({ type: [String] })
  @Property({ type: 'json', nullable: true })
  ccRecipients?: string[];

  @ApiPropertyOptional({ type: [String] })
  @Property({ type: 'json', nullable: true })
  bccRecipients?: string[];

  @ApiProperty()
  @Property({ length: 256, nullable: false })
  subject!: string;

  @ApiProperty()
  @Sapling(['isMarkdown'])
  @Property({ nullable: false, length: 8192 })
  bodyMarkdown!: string;

  @ApiProperty()
  @Property({ nullable: false, length: 16384 })
  bodyHtml!: string;

  @ApiPropertyOptional({ type: [Number] })
  @Property({ type: 'json', nullable: true })
  attachmentHandles?: number[];

  @ApiPropertyOptional()
  @Property({ type: 'json', nullable: true })
  requestPayload?: object;

  @ApiPropertyOptional()
  @Property({ nullable: true })
  responseStatusCode?: number;

  @ApiPropertyOptional()
  @Property({ type: 'json', nullable: true })
  responseBody?: object;

  @ApiPropertyOptional()
  @Property({ nullable: true, length: 256 })
  providerMessageId?: string;

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: true, type: 'datetime' })
  completedAt?: Date;

  @ApiProperty()
  @Property({ default: 0, nullable: false })
  attemptCount!: number;

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: true, type: 'datetime' })
  nextRetryAt?: Date;

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
