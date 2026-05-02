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
import { TeamsTemplateItem } from './TeamsTemplateItem';
import { TeamsDeliveryItem } from './TeamsDeliveryItem';
import { WebhookSubscriptionTypeItem } from './WebhookSubscriptionTypeItem';

@Entity()
export class TeamsSubscriptionItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiPropertyOptional({ type: () => TeamsDeliveryItem, isArray: true })
  @OneToMany(() => TeamsDeliveryItem, (x) => x.subscription)
  deliveries: Collection<TeamsDeliveryItem> = new Collection<TeamsDeliveryItem>(
    this,
  );

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'teamsSubscription.groupContent',
    groupOrder: 100,
    width: 4,
  })
  @Property({ length: 128, nullable: false })
  description!: string;

  @ApiProperty()
  @SaplingForm({
    order: 200,
    group: 'teamsSubscription.groupContent',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 64, nullable: false })
  recipientField!: string;

  @ApiProperty()
  @SaplingForm({
    order: 100,
    group: 'teamsSubscription.groupConfiguration',
    groupOrder: 200,
    width: 1,
  })
  @Property({ default: true, nullable: false })
  isActive: boolean = true;

  @ApiProperty({ type: () => EntityItem })
  @Sapling(['isEntity'])
  @SaplingForm({
    order: 100,
    group: 'teamsSubscription.groupContent',
    groupOrder: 150,
    width: 2,
  })
  @ManyToOne(() => EntityItem, { nullable: false })
  entity!: Rel<EntityItem>;

  @ApiProperty({ type: () => WebhookSubscriptionTypeItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 200,
    group: 'teamsSubscription.groupReference',
    groupOrder: 300,
    width: 1,
  })
  @ManyToOne(() => WebhookSubscriptionTypeItem, {
    defaultRaw: `'afterInsert'`,
    nullable: false,
  })
  type!: Rel<WebhookSubscriptionTypeItem>;

  @ApiProperty({ type: () => TeamsTemplateItem })
  @SaplingDependsOn({
    parentField: 'entity',
    targetField: 'entity',
    requireParent: true,
    clearOnParentChange: true,
  })
  @SaplingForm({
    order: 300,
    group: 'teamsSubscription.groupReference',
    groupOrder: 300,
    width: 2,
  })
  @ManyToOne(() => TeamsTemplateItem, { nullable: false })
  template!: Rel<TeamsTemplateItem>;

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
