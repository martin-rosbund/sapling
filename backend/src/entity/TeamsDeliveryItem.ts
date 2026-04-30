import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type Rel } from '@mikro-orm/core';
import { EntityItem } from './EntityItem';
import { PersonItem } from './PersonItem';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { TeamsDeliveryStatusItem } from './TeamsDeliveryStatusItem';
import { TeamsSubscriptionItem } from './TeamsSubscriptionItem';
import { TeamsTemplateItem } from './TeamsTemplateItem';

@Entity()
export class TeamsDeliveryItem {
  @ApiPropertyOptional({
    type: () => TeamsDeliveryStatusItem,
    default: 'pending',
  })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 100,
    group: 'teamsDelivery.groupReference',
    groupOrder: 100,
    width: 1,
  })
  @ManyToOne(() => TeamsDeliveryStatusItem, {
    defaultRaw: `'pending'`,
    nullable: true,
  })
  status?: Rel<TeamsDeliveryStatusItem>;

  @ApiProperty({ type: () => TeamsSubscriptionItem })
  @SaplingForm({
    order: 100,
    group: 'teamsDelivery.groupContent',
    groupOrder: 200,
    width: 4,
  })
  @ManyToOne(() => TeamsSubscriptionItem, { nullable: false })
  subscription!: Rel<TeamsSubscriptionItem>;

  @ApiPropertyOptional({ type: () => TeamsTemplateItem })
  @SaplingForm({
    order: 200,
    group: 'teamsDelivery.groupContent',
    groupOrder: 200,
    width: 4,
  })
  @ManyToOne(() => TeamsTemplateItem, { nullable: true })
  template?: Rel<TeamsTemplateItem>;

  @ApiProperty({ type: () => EntityItem })
  @Sapling(['isEntity'])
  @SaplingForm({
    order: 200,
    group: 'teamsDelivery.groupReference',
    groupOrder: 100,
    width: 2,
  })
  @ManyToOne(() => EntityItem, { nullable: false })
  entity!: Rel<EntityItem>;

  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson'])
  @SaplingForm({
    order: 300,
    group: 'teamsDelivery.groupReference',
    groupOrder: 100,
    width: 2,
  })
  @ManyToOne(() => PersonItem, { nullable: false })
  createdBy!: Rel<PersonItem>;

  @ApiPropertyOptional({ type: () => PersonItem })
  @Sapling(['isPerson'])
  @SaplingForm({
    order: 400,
    group: 'teamsDelivery.groupReference',
    groupOrder: 100,
    width: 2,
  })
  @ManyToOne(() => PersonItem, { nullable: true })
  recipientPerson?: Rel<PersonItem>;

  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 100,
    group: 'teamsDelivery.groupBasics',
    groupOrder: 300,
    width: 2,
  })
  @Property({ nullable: true, length: 64 })
  referenceHandle?: string;

  @ApiProperty()
  @Sapling(['isChip'])
  @SaplingForm({
    order: 200,
    group: 'teamsDelivery.groupBasics',
    groupOrder: 300,
    width: 1,
  })
  @Property({ length: 32, nullable: false, default: 'azure' })
  provider: string = 'azure';

  @ApiProperty()
  @Sapling(['isMarkdown'])
  @SaplingForm({
    order: 300,
    group: 'teamsDelivery.groupContent',
    groupOrder: 200,
    width: 4,
  })
  @Property({ nullable: false, length: 8192 })
  bodyMarkdown!: string;

  @ApiProperty()
  @SaplingForm({
    order: 400,
    group: 'teamsDelivery.groupContent',
    groupOrder: 200,
    width: 4,
  })
  @Property({ nullable: false, length: 16384 })
  bodyHtml!: string;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 500,
    group: 'teamsDelivery.groupContent',
    groupOrder: 200,
    width: 4,
  })
  @Property({ type: 'json', nullable: true })
  requestPayload?: object;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 300,
    group: 'teamsDelivery.groupBasics',
    groupOrder: 300,
    width: 1,
  })
  @Property({ nullable: true })
  responseStatusCode?: number;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 600,
    group: 'teamsDelivery.groupContent',
    groupOrder: 200,
    width: 4,
  })
  @Property({ type: 'json', nullable: true })
  responseBody?: object;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 700,
    group: 'teamsDelivery.groupContent',
    groupOrder: 200,
    width: 4,
  })
  @Property({ nullable: true, length: 256 })
  providerMessageId?: string;

  @ApiProperty({ type: 'string', format: 'date-time' })
  @SaplingForm({
    order: 100,
    group: 'teamsDelivery.groupSchedule',
    groupOrder: 400,
    width: 1,
  })
  @Property({ nullable: true, type: 'datetime' })
  completedAt?: Date;

  @ApiProperty()
  @SaplingForm({
    order: 400,
    group: 'teamsDelivery.groupBasics',
    groupOrder: 300,
    width: 1,
  })
  @Property({ default: 0, nullable: false })
  attemptCount!: number;

  @ApiProperty({ type: 'string', format: 'date-time' })
  @SaplingForm({
    order: 200,
    group: 'teamsDelivery.groupSchedule',
    groupOrder: 400,
    width: 1,
  })
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
