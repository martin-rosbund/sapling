import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiProviderModelItem } from './AiProviderModelItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

@Entity()
export class AiProviderTypeItem {
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ primary: true, length: 64 })
  handle!: string;

  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'aiProviderType.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 128, nullable: false })
  title!: string;

  @ApiProperty()
  @Sapling(['isIcon'])
  @SaplingForm({
    order: 100,
    group: 'aiProviderType.groupAppearance',
    groupOrder: 200,
    width: 1,
  })
  @Property({ default: 'mdi-robot-outline', length: 64, nullable: false })
  icon = 'mdi-robot-outline';

  @ApiProperty()
  @Sapling(['isColor'])
  @SaplingForm({
    order: 200,
    group: 'aiProviderType.groupAppearance',
    groupOrder: 200,
    width: 1,
  })
  @Property({ default: '#546E7A', length: 32, nullable: false })
  color = '#546E7A';

  @ApiPropertyOptional({ type: [String] })
  @SaplingForm({
    order: 100,
    group: 'aiProviderType.groupSecurity',
    groupOrder: 300,
    width: 2,
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
  })
  @Property({ type: 'json', nullable: true })
  credentials?: Record<string, string> | null;

  @ApiProperty()
  @SaplingForm({
    order: 100,
    group: 'aiProviderType.groupConfiguration',
    groupOrder: 400,
    width: 2,
  })
  @Property({ nullable: false, default: true })
  isActive = true;

  @ApiPropertyOptional({ type: () => AiProviderModelItem, isArray: true })
  @OneToMany(() => AiProviderModelItem, (model) => model.provider)
  models: Collection<AiProviderModelItem> = new Collection<AiProviderModelItem>(
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
