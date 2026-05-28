import { type Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiProviderModelItem } from './AiProviderModelItem';
import { AiProviderTypeItem } from './AiProviderTypeItem';
import { EntityItem } from './EntityItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

@Entity()
export class AiEntityGenerationTemplateItem {
  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'aiEntityGenerationTemplate.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ primary: true, length: 64 })
  handle!: string;

  @ApiProperty()
  @Sapling(['isValue'])
  @SaplingForm({
    order: 200,
    group: 'aiEntityGenerationTemplate.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 128, nullable: false })
  title!: string;

  @ApiProperty()
  @SaplingForm({
    order: 300,
    group: 'aiEntityGenerationTemplate.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 128, nullable: false })
  actionName!: string;

  @ApiProperty({ type: () => EntityItem })
  @Sapling(['isEntity'])
  @SaplingForm({
    order: 100,
    group: 'aiEntityGenerationTemplate.groupSource',
    groupOrder: 200,
    width: 2,
  })
  @ManyToOne(() => EntityItem, { nullable: false })
  sourceEntity!: Rel<EntityItem>;

  @ApiProperty({ type: () => EntityItem })
  @Sapling(['isEntity'])
  @SaplingForm({
    order: 200,
    group: 'aiEntityGenerationTemplate.groupSource',
    groupOrder: 200,
    width: 2,
  })
  @ManyToOne(() => EntityItem, { nullable: false })
  targetEntity!: Rel<EntityItem>;

  @ApiPropertyOptional({ type: [String] })
  @SaplingForm({
    order: 300,
    group: 'aiEntityGenerationTemplate.groupSource',
    groupOrder: 200,
    width: 4,
  })
  @Property({ type: 'json', nullable: true })
  sourceRelations?: string[] | null;

  @ApiProperty()
  @Sapling(['isMarkdown'])
  @SaplingForm({
    order: 100,
    group: 'aiEntityGenerationTemplate.groupPrompt',
    groupOrder: 300,
    width: 4,
  })
  @Property({ type: 'text', nullable: false })
  promptMarkdown!: string;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 100,
    group: 'aiEntityGenerationTemplate.groupMapping',
    groupOrder: 400,
    width: 2,
  })
  @Property({ type: 'json', nullable: true })
  fieldMapping?: Record<string, string> | null;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 200,
    group: 'aiEntityGenerationTemplate.groupMapping',
    groupOrder: 400,
    width: 2,
  })
  @Property({ type: 'json', nullable: true })
  targetDefaults?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 300,
    group: 'aiEntityGenerationTemplate.groupMapping',
    groupOrder: 400,
    width: 2,
  })
  @Property({ length: 128, nullable: true })
  sourceReferenceField?: string | null;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 400,
    group: 'aiEntityGenerationTemplate.groupMapping',
    groupOrder: 400,
    width: 2,
  })
  @Property({ length: 128, nullable: true })
  userReferenceField?: string | null;

  @ApiPropertyOptional({ type: () => AiProviderTypeItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 100,
    group: 'aiEntityGenerationTemplate.groupRuntime',
    groupOrder: 500,
    width: 2,
  })
  @ManyToOne(() => AiProviderTypeItem, { nullable: true })
  provider?: Rel<AiProviderTypeItem> | null;

  @ApiPropertyOptional({ type: () => AiProviderModelItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 200,
    group: 'aiEntityGenerationTemplate.groupRuntime',
    groupOrder: 500,
    width: 2,
  })
  @ManyToOne(() => AiProviderModelItem, { nullable: true })
  model?: Rel<AiProviderModelItem> | null;

  @ApiPropertyOptional({ default: true })
  @SaplingForm({
    order: 100,
    group: 'aiEntityGenerationTemplate.groupConfiguration',
    groupOrder: 600,
    width: 1,
  })
  @Property({ default: true, nullable: false })
  isActive = true;

  @ApiPropertyOptional({ default: 100 })
  @SaplingForm({
    order: 200,
    group: 'aiEntityGenerationTemplate.groupConfiguration',
    groupOrder: 600,
    width: 1,
  })
  @Property({ default: 100, nullable: false })
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
