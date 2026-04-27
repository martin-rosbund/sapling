import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { EmailDeliveryItem } from './EmailDeliveryItem';

@Entity()
export class EmailDeliveryStatusItem {
  @ApiProperty()
  @Property({ primary: true, length: 64 })
  handle!: string;

  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'emailDeliveryStatus.groupContent',
    groupOrder: 100,
    width: 4,
  })
  @Property({ length: 64, nullable: false })
  description!: string;

  @ApiProperty()
  @Sapling(['isIcon'])
  @SaplingForm({
    order: 100,
    group: 'emailDeliveryStatus.groupAppearance',
    groupOrder: 200,
    width: 1,
  })
  @Property({ default: 'mdi-email-outline', length: 64, nullable: false })
  icon?: string = 'mdi-email-outline';

  @ApiProperty()
  @Sapling(['isColor'])
  @SaplingForm({
    order: 200,
    group: 'emailDeliveryStatus.groupAppearance',
    groupOrder: 200,
    width: 1,
  })
  @Property({ default: '#4CAF50', length: 32, nullable: false })
  color!: string;

  @ApiPropertyOptional({ type: () => EmailDeliveryItem, isArray: true })
  @OneToMany(() => EmailDeliveryItem, (x) => x.status)
  deliveries: Collection<EmailDeliveryItem> = new Collection<EmailDeliveryItem>(
    this,
  );

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
