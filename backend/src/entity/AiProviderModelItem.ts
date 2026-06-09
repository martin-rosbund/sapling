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
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ length: 128, nullable: false })
  title!: string;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 100,
    group: 'aiProviderModel.groupContent',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 100,
    tableVisible: false,
    mobileOrder: 100,
    mobileVisible: false,
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
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @ManyToOne(() => AiProviderTypeItem, { nullable: false })
  provider!: Rel<AiProviderTypeItem>;

  @ApiProperty()
  @SaplingForm({
    order: 100,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ length: 128, nullable: false })
  providerModel!: string;

  @ApiPropertyOptional({ default: true })
  @SaplingForm({
    order: 200,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ nullable: false, default: true })
  supportsStreaming = true;

  @ApiPropertyOptional({ default: false })
  @SaplingForm({
    order: 300,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 2,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ nullable: false, default: false })
  supportsTools = false;

  @ApiPropertyOptional({ default: false })
  @SaplingForm({
    order: 400,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 2,
    visible: true,
    tableOrder: 400,
    tableVisible: true,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @Property({ nullable: false, default: false })
  supportsEmbeddings = false;

  @ApiPropertyOptional({ default: false })
  @SaplingForm({
    order: 500,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 2,
    visible: true,
    tableOrder: 500,
    tableVisible: true,
    mobileOrder: 500,
    mobileVisible: false,
  })
  @Property({ nullable: false, default: false })
  supportsTranscription = false;

  @ApiPropertyOptional({ default: 32 })
  @SaplingForm({
    order: 525,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 1,
    visible: true,
    tableOrder: 525,
    tableVisible: true,
    mobileOrder: 525,
    mobileVisible: false,
  })
  @Property({ nullable: false, default: 32 })
  embeddingBatchSize = 32;

  @ApiPropertyOptional({ default: 1200 })
  @SaplingForm({
    order: 530,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 1,
    visible: true,
    tableOrder: 530,
    tableVisible: true,
    mobileOrder: 530,
    mobileVisible: false,
  })
  @Property({ nullable: false, default: 1200 })
  vectorChunkLength = 1200;

  @ApiPropertyOptional({ default: 200 })
  @SaplingForm({
    order: 535,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 1,
    visible: true,
    tableOrder: 535,
    tableVisible: true,
    mobileOrder: 535,
    mobileVisible: false,
  })
  @Property({ nullable: false, default: 200 })
  vectorChunkOverlap = 200;

  @ApiPropertyOptional({ default: 6 })
  @SaplingForm({
    order: 540,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 1,
    visible: true,
    tableOrder: 540,
    tableVisible: true,
    mobileOrder: 540,
    mobileVisible: false,
  })
  @Property({ nullable: false, default: 6 })
  vectorSearchCandidateMultiplier = 6;

  @ApiPropertyOptional({ default: 60 })
  @SaplingForm({
    order: 545,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 1,
    visible: true,
    tableOrder: 545,
    tableVisible: true,
    mobileOrder: 545,
    mobileVisible: false,
  })
  @Property({ nullable: false, default: 60 })
  vectorSearchMaxCandidateLimit = 60;

  @ApiPropertyOptional({ default: 10 })
  @SaplingForm({
    order: 548,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 1,
    visible: true,
    tableOrder: 548,
    tableVisible: true,
    mobileOrder: 548,
    mobileVisible: false,
  })
  @Property({ nullable: false, default: 10 })
  vectorSearchMaxResults = 10;

  @ApiPropertyOptional({ default: false })
  @SaplingForm({
    order: 550,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 2,
    visible: true,
    tableOrder: 550,
    tableVisible: true,
    mobileOrder: 550,
    mobileVisible: false,
  })
  @Property({ nullable: false, default: false })
  supportsSpeech = false;

  @ApiPropertyOptional({ default: 'nova' })
  @SaplingForm({
    order: 650,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 2,
    visible: true,
    tableOrder: 650,
    tableVisible: true,
    mobileOrder: 650,
    mobileVisible: false,
  })
  @Property({ length: 64, nullable: false, default: 'nova' })
  speechVoice = 'nova';

  @ApiPropertyOptional({ default: 1 })
  @SaplingForm({
    order: 750,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 1,
    visible: true,
    tableOrder: 750,
    tableVisible: true,
    mobileOrder: 750,
    mobileVisible: false,
  })
  @Property({ nullable: false, default: 1, type: 'float' })
  speechSpeed = 1;

  @ApiPropertyOptional({ default: 'audio/mpeg' })
  @SaplingForm({
    order: 850,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 2,
    visible: true,
    tableOrder: 850,
    tableVisible: true,
    mobileOrder: 850,
    mobileVisible: false,
  })
  @Property({ length: 128, nullable: false, default: 'audio/mpeg' })
  speechMimeType = 'audio/mpeg';

  @ApiPropertyOptional({ default: 'mp3' })
  @SaplingForm({
    order: 950,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 1,
    visible: true,
    tableOrder: 950,
    tableVisible: true,
    mobileOrder: 950,
    mobileVisible: false,
  })
  @Property({ length: 16, nullable: false, default: 'mp3' })
  speechFileExtension = 'mp3';

  @ApiPropertyOptional({ default: 4000 })
  @SaplingForm({
    order: 1050,
    group: 'aiProviderModel.groupIntegration',
    groupOrder: 400,
    width: 1,
    visible: true,
    tableOrder: 1050,
    tableVisible: true,
    mobileOrder: 1050,
    mobileVisible: false,
  })
  @Property({ nullable: false, default: 4000 })
  speechMaxInputLength = 4000;

  @ApiPropertyOptional({ default: 8 })
  @SaplingForm({
    order: 200,
    group: 'aiProviderModel.groupBasics',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ nullable: false, default: 8 })
  maxToolCallIterations = 8;

  @ApiPropertyOptional({ default: false })
  @SaplingForm({
    order: 100,
    group: 'aiProviderModel.groupConfiguration',
    groupOrder: 500,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ nullable: false, default: false })
  isDefault = false;

  @ApiPropertyOptional({ default: true })
  @SaplingForm({
    order: 200,
    group: 'aiProviderModel.groupConfiguration',
    groupOrder: 500,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ nullable: false, default: true })
  isActive = true;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 300,
    group: 'aiProviderModel.groupConfiguration',
    groupOrder: 500,
    width: 1,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ nullable: true, default: 0 })
  sortOrder?: number | null = 0;

  @ApiPropertyOptional({ type: () => AiChatSessionItem, isArray: true })
  @OneToMany(() => AiChatSessionItem, (session) => session.model)
  sessions: Collection<AiChatSessionItem> = new Collection<AiChatSessionItem>(
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
