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
import { Sapling, SaplingForm } from './global/entity.decorator';

@Entity()
export class AiProviderModelItem {
  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @Property({ primary: true, length: 64 })
  handle!: string;

  @ApiProperty()
  @Sapling(['isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'aiProviderModel.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 128, nullable: false })
  title!: string;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 100,
    group: 'aiProviderModel.groupContent',
    groupOrder: 200,
    width: 4,
  })
  @Property({ length: 512, nullable: true })
  description?: string | null;

  @ApiProperty({ type: () => AiProviderTypeItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 100,
    group: 'aiProviderModel.groupReference',
    groupOrder: 300,
    width: 1,
  })
  @ManyToOne(() => AiProviderTypeItem, { nullable: false })
  provider!: Rel<AiProviderTypeItem>;

  @ApiProperty()
  @SaplingForm({
    order: 100,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 2,
  })
  @Property({ length: 128, nullable: false })
  providerModel!: string;

  @ApiProperty()
  @SaplingForm({
    order: 200,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 2,
  })
  @Property({ nullable: false, default: true })
  supportsStreaming = true;

  @ApiProperty()
  @SaplingForm({
    order: 300,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 2,
  })
  @Property({ nullable: false, default: false })
  supportsTools = false;

  @ApiProperty()
  @SaplingForm({
    order: 400,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 2,
  })
  @Property({ nullable: false, default: false })
  supportsEmbeddings = false;

  @ApiProperty()
  @SaplingForm({
    order: 500,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 2,
  })
  @Property({ nullable: false, default: false })
  supportsTranscription = false;

  @ApiProperty()
  @SaplingForm({
    order: 525,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 1,
  })
  @Property({ nullable: false, default: 32 })
  embeddingBatchSize = 32;

  @ApiProperty()
  @SaplingForm({
    order: 530,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 1,
  })
  @Property({ nullable: false, default: 1200 })
  vectorChunkLength = 1200;

  @ApiProperty()
  @SaplingForm({
    order: 535,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 1,
  })
  @Property({ nullable: false, default: 200 })
  vectorChunkOverlap = 200;

  @ApiProperty()
  @SaplingForm({
    order: 540,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 1,
  })
  @Property({ nullable: false, default: 6 })
  vectorSearchCandidateMultiplier = 6;

  @ApiProperty()
  @SaplingForm({
    order: 545,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 1,
  })
  @Property({ nullable: false, default: 60 })
  vectorSearchMaxCandidateLimit = 60;

  @ApiProperty()
  @SaplingForm({
    order: 548,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 1,
  })
  @Property({ nullable: false, default: 10 })
  vectorSearchMaxResults = 10;

  @ApiProperty()
  @SaplingForm({
    order: 550,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 2,
  })
  @Property({ nullable: false, default: false })
  supportsSpeech = false;

  @ApiProperty()
  @SaplingForm({
    order: 650,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 2,
  })
  @Property({ length: 64, nullable: false, default: 'nova' })
  speechVoice = 'nova';

  @ApiProperty()
  @SaplingForm({
    order: 750,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 1,
  })
  @Property({ nullable: false, default: 1, type: 'float' })
  speechSpeed = 1;

  @ApiProperty()
  @SaplingForm({
    order: 850,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 2,
  })
  @Property({ length: 128, nullable: false, default: 'audio/mpeg' })
  speechMimeType = 'audio/mpeg';

  @ApiProperty()
  @SaplingForm({
    order: 950,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 1,
  })
  @Property({ length: 16, nullable: false, default: 'mp3' })
  speechFileExtension = 'mp3';

  @ApiProperty()
  @SaplingForm({
    order: 1050,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 1,
  })
  @Property({ nullable: false, default: 4000 })
  speechMaxInputLength = 4000;

  @ApiProperty()
  @SaplingForm({
    order: 200,
    group: 'aiProviderModel.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ nullable: false, default: 8 })
  maxToolCallIterations = 8;

  @ApiProperty()
  @SaplingForm({
    order: 100,
    group: 'aiProviderModel.groupConfiguration',
    groupOrder: 500,
    width: 2,
  })
  @Property({ nullable: false, default: false })
  isDefault = false;

  @ApiProperty()
  @SaplingForm({
    order: 200,
    group: 'aiProviderModel.groupConfiguration',
    groupOrder: 500,
    width: 2,
  })
  @Property({ nullable: false, default: true })
  isActive = true;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 300,
    group: 'aiProviderModel.groupConfiguration',
    groupOrder: 500,
    width: 1,
  })
  @Property({ nullable: true, default: 0 })
  sortOrder?: number | null = 0;

  @ApiPropertyOptional({ type: () => AiChatSessionItem, isArray: true })
  @OneToMany(() => AiChatSessionItem, (session) => session.model)
  sessions: Collection<AiChatSessionItem> = new Collection<AiChatSessionItem>(
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
