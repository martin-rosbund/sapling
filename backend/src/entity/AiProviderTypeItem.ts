import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiProviderModelItem } from './AiProviderModelItem';
import { Sapling } from './global/entity.decorator';

@Entity()
export class AiProviderTypeItem {
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ primary: true, length: 64 })
  handle!: string;

  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 128, nullable: false })
  title!: string;

  @ApiProperty()
  @Sapling(['isIcon'])
  @Property({ default: 'mdi-robot-outline', length: 64, nullable: false })
  icon = 'mdi-robot-outline';

  @ApiProperty()
  @Sapling(['isColor'])
  @Property({ default: '#546E7A', length: 32, nullable: false })
  color = '#546E7A';

  @ApiPropertyOptional({ type: [String] })
  @Property({ type: 'json', nullable: true })
  credentialTypes?: string[] | null;

  @ApiPropertyOptional()
  @Sapling(['isSecurity'])
  @Property({ type: 'json', nullable: true })
  credentials?: Record<string, string> | null;

  @ApiProperty()
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
