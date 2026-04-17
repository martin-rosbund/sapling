import { Collection, type Rel } from '@mikro-orm/core';
import {
  Entity,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PersonItem } from './PersonItem';
import { Sapling } from './global/entity.decorator';
import { AiChatMessageItem } from './AiChatMessageItem';

@Entity()
export class AiChatSessionItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 256, nullable: false })
  title!: string;

  @ApiProperty()
  @Property({ default: false, nullable: false })
  isArchived = false;

  @ApiPropertyOptional()
  @Sapling(['isChip'])
  @Property({ length: 64, nullable: true })
  provider?: string | null;

  @ApiPropertyOptional()
  @Property({ length: 128, nullable: true })
  model?: string | null;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: true, type: 'datetime' })
  lastMessageAt?: Date | null;

  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson', 'isCurrentPerson'])
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: Rel<PersonItem>;

  @ApiPropertyOptional({ type: () => AiChatMessageItem, isArray: true })
  @OneToMany(() => AiChatMessageItem, (message) => message.session)
  messages: Collection<AiChatMessageItem> = new Collection<AiChatMessageItem>(this);

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}