import { Collection, type Rel } from '@mikro-orm/core';
import {
  Entity,
  ManyToMany,
  ManyToOne,
  Property,
} from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiAgentItem } from './AiAgentItem';
import { RoleItem } from './RoleItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

@Entity()
export class AiAgentMemoryItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty({ type: () => AiAgentItem })
  @Sapling(['isChip'])
  @ManyToOne(() => AiAgentItem, { nullable: false })
  agent!: Rel<AiAgentItem>;

  @ApiProperty()
  @Sapling(['isChip'])
  @SaplingForm({
    order: 100,
    group: 'aiAgentMemory.groupBasics',
    groupOrder: 100,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ length: 32, nullable: false })
  type!: string;

  @ApiProperty()
  @Sapling(['isValue'])
  @SaplingForm({
    order: 200,
    group: 'aiAgentMemory.groupBasics',
    groupOrder: 100,
    width: 3,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: true,
  })
  @Property({ length: 160, nullable: false })
  title!: string;

  @ApiProperty()
  @Sapling(['isMarkdown'])
  @SaplingForm({
    order: 300,
    group: 'aiAgentMemory.groupBasics',
    groupOrder: 100,
    width: 4,
    visible: true,
    tableOrder: 300,
    tableVisible: false,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ type: 'text', nullable: false })
  contentMarkdown!: string;

  @ApiPropertyOptional({ type: [String] })
  @Property({ type: 'json', nullable: true })
  entityScopeHandles?: string[] | null;

  @ApiPropertyOptional({ type: () => RoleItem, isArray: true })
  @ManyToMany(() => RoleItem, undefined, { owner: true })
  roles: Collection<RoleItem> = new Collection<RoleItem>(this);

  @ApiPropertyOptional({ default: true })
  @Property({ nullable: false, default: true })
  isActive = true;

  @ApiPropertyOptional({ default: 100 })
  @Property({ nullable: false, default: 100 })
  sortOrder = 100;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
