import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiProviderModelItem } from './AiProviderModelItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

@Entity()
export class AiProviderTypeItem {
  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @Property({ primary: true, length: 64 })
  handle!: string;

  @ApiProperty()
  @Sapling(['isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'aiProviderType.groupBasics',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ length: 128, nullable: false })
  title!: string;

  @ApiPropertyOptional({ default: 'mdi-robot-outline' })
  @Sapling(['isIcon'])
  @SaplingForm({
    order: 100,
    group: 'aiProviderType.groupAppearance',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ default: 'mdi-robot-outline', length: 64, nullable: false })
  icon = 'mdi-robot-outline';

  @ApiPropertyOptional({ default: '#546E7A' })
  @Sapling(['isColor'])
  @SaplingForm({
    order: 200,
    group: 'aiProviderType.groupAppearance',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ default: '#546E7A', length: 32, nullable: false })
  color = '#546E7A';

  @ApiPropertyOptional({ type: [String] })
  @SaplingForm({
    order: 100,
    group: 'aiProviderType.groupSecurity',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: false,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  credentialTypes?: string[] | null;

  @ApiPropertyOptional()
  @Sapling(['isSecurity'])
  @SaplingForm({
    order: 200,
    group: 'aiProviderType.groupSecurity',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: false,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true, hidden: true })
  credentials?: Record<string, string> | null;

  @ApiPropertyOptional({ default: true })
  @SaplingForm({
    order: 100,
    group: 'aiProviderType.groupConfiguration',
    groupOrder: 400,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ nullable: false, default: true })
  isActive = true;

  @ApiPropertyOptional({ type: () => AiProviderModelItem, isArray: true })
  @OneToMany(() => AiProviderModelItem, (model) => model.provider)
  models: Collection<AiProviderModelItem> = new Collection<AiProviderModelItem>(
    this,
  );

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
