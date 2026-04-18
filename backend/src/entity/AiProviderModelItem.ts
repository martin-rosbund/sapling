import { Collection, type Rel } from '@mikro-orm/core';
import {
  Entity,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiChatSessionItem } from './AiChatSessionItem';
import { AiProviderTypeItem } from './AiProviderTypeItem';
import { Sapling } from './global/entity.decorator';

@Entity()
export class AiProviderModelItem {
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ primary: true, length: 64 })
  handle!: string;

  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 128, nullable: false })
  title!: string;

  @ApiPropertyOptional()
  @Property({ length: 512, nullable: true })
  description?: string | null;

  @ApiProperty({ type: () => AiProviderTypeItem })
  @Sapling(['isChip'])
  @ManyToOne(() => AiProviderTypeItem, { nullable: false })
  provider!: Rel<AiProviderTypeItem>;

  @ApiProperty()
  @Property({ length: 128, nullable: false })
  providerModel!: string;

  @ApiProperty()
  @Property({ nullable: false, default: true })
  supportsStreaming = true;

  @ApiProperty()
  @Property({ nullable: false, default: false })
  supportsTools = false;

  @ApiProperty()
  @Property({ nullable: false, default: 8 })
  maxToolCallIterations = 8;

  @ApiProperty()
  @Property({ nullable: false, default: false })
  isDefault = false;

  @ApiProperty()
  @Property({ nullable: false, default: true })
  isActive = true;

  @ApiPropertyOptional()
  @Property({ nullable: true, default: 0 })
  sortOrder?: number | null = 0;

  @ApiPropertyOptional({ type: () => AiChatSessionItem, isArray: true })
  @OneToMany(() => AiChatSessionItem, (session) => session.model)
  sessions: Collection<AiChatSessionItem> = new Collection<AiChatSessionItem>(this);

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}