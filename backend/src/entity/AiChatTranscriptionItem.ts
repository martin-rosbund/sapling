import { type Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiChatMessageItem } from './AiChatMessageItem';
import { AiChatSessionItem } from './AiChatSessionItem';
import { AiProviderModelItem } from './AiProviderModelItem';
import { AiProviderTypeItem } from './AiProviderTypeItem';
import { DocumentItem } from './DocumentItem';
import { PersonItem } from './PersonItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

@Entity()
export class AiChatTranscriptionItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiPropertyOptional({ type: () => AiChatSessionItem })
  @SaplingForm({
    order: 100,
    group: 'aiChatTranscription.groupReference',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @ManyToOne(() => AiChatSessionItem, { nullable: true })
  session?: Rel<AiChatSessionItem> | null;

  @ApiPropertyOptional({ type: () => AiChatMessageItem })
  @SaplingForm({
    order: 200,
    group: 'aiChatTranscription.groupReference',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @ManyToOne(() => AiChatMessageItem, { nullable: true })
  message?: Rel<AiChatMessageItem> | null;

  @ApiPropertyOptional({ type: () => DocumentItem })
  @SaplingForm({
    order: 300,
    group: 'aiChatTranscription.groupReference',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @ManyToOne(() => DocumentItem, { nullable: true })
  document?: Rel<DocumentItem> | null;

  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson', 'isCurrentPerson'])
  @SaplingForm({
    order: 400,
    group: 'aiChatTranscription.groupReference',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 400,
    tableVisible: true,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: Rel<PersonItem>;

  @ApiPropertyOptional({ type: () => AiProviderTypeItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 500,
    group: 'aiChatTranscription.groupReference',
    groupOrder: 100,
    width: 1,
    visible: true,
    tableOrder: 500,
    tableVisible: true,
    mobileOrder: 500,
    mobileVisible: false,
  })
  @ManyToOne(() => AiProviderTypeItem, { nullable: true })
  provider?: Rel<AiProviderTypeItem> | null;

  @ApiPropertyOptional({ type: () => AiProviderModelItem })
  @SaplingForm({
    order: 600,
    group: 'aiChatTranscription.groupReference',
    groupOrder: 100,
    width: 1,
    visible: true,
    tableOrder: 600,
    tableVisible: true,
    mobileOrder: 600,
    mobileVisible: false,
  })
  @ManyToOne(() => AiProviderModelItem, { nullable: true })
  model?: Rel<AiProviderModelItem> | null;

  @ApiPropertyOptional({ default: 'processing' })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 100,
    group: 'aiChatTranscription.groupBasics',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ length: 32, nullable: false, default: 'processing' })
  status = 'processing';

  @ApiPropertyOptional()
  @Sapling(['isValue'])
  @SaplingForm({
    order: 100,
    group: 'aiChatTranscription.groupContent',
    groupOrder: 300,
    width: 4,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ length: 16384, nullable: true })
  transcript?: string | null;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 200,
    group: 'aiChatTranscription.groupContent',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ length: 16, nullable: true })
  detectedLanguage?: string | null;

  @ApiProperty()
  @SaplingForm({
    order: 100,
    group: 'aiChatTranscription.groupIntegration',
    groupOrder: 400,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ length: 128, nullable: false })
  mimeType!: string;

  @ApiProperty()
  @SaplingForm({
    order: 200,
    group: 'aiChatTranscription.groupIntegration',
    groupOrder: 400,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ nullable: false })
  byteLength!: number;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 300,
    group: 'aiChatTranscription.groupIntegration',
    groupOrder: 400,
    width: 1,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ nullable: true, type: 'float' })
  durationSeconds?: number | null;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 300,
    group: 'aiChatTranscription.groupContent',
    groupOrder: 300,
    width: 4,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  requestPayload?: object | null;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 400,
    group: 'aiChatTranscription.groupContent',
    groupOrder: 300,
    width: 4,
    visible: true,
    tableOrder: 400,
    tableVisible: true,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  responsePayload?: object | null;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 500,
    group: 'aiChatTranscription.groupContent',
    groupOrder: 300,
    width: 4,
    visible: true,
    tableOrder: 500,
    tableVisible: true,
    mobileOrder: 500,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  failurePayload?: object | null;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
