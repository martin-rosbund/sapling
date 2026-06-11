import { type Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiChatMessageItem } from './AiChatMessageItem';
import { AiChatSessionItem } from './AiChatSessionItem';
import { DocumentItem } from './DocumentItem';
import { ImportBatchItem } from './ImportBatchItem';
import { PersonItem } from './PersonItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

@Entity()
export class AiChatAttachmentItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiPropertyOptional({ type: () => AiChatSessionItem })
  @SaplingForm({
    order: 100,
    group: 'aiChatAttachment.groupReference',
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
    group: 'aiChatAttachment.groupReference',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: false,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @ManyToOne(() => AiChatMessageItem, { nullable: true })
  message?: Rel<AiChatMessageItem> | null;

  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson', 'isCurrentPerson'])
  @SaplingForm({
    order: 300,
    group: 'aiChatAttachment.groupReference',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: Rel<PersonItem>;

  @ApiProperty({ type: () => DocumentItem })
  @SaplingForm({
    order: 400,
    group: 'aiChatAttachment.groupReference',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 400,
    tableVisible: false,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @ManyToOne(() => DocumentItem, { nullable: false })
  document!: Rel<DocumentItem>;

  @ApiPropertyOptional({ type: () => ImportBatchItem })
  @SaplingForm({
    order: 500,
    group: 'aiChatAttachment.groupReference',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 500,
    tableVisible: true,
    mobileOrder: 500,
    mobileVisible: true,
  })
  @ManyToOne(() => ImportBatchItem, { nullable: true })
  importBatch?: Rel<ImportBatchItem> | null;

  @ApiPropertyOptional({ default: 'importAnalysis' })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 100,
    group: 'aiChatAttachment.groupFile',
    groupOrder: 200,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ length: 64, nullable: false, default: 'importAnalysis' })
  purpose = 'importAnalysis';

  @ApiProperty()
  @Sapling(['isValue'])
  @SaplingForm({
    order: 200,
    group: 'aiChatAttachment.groupFile',
    groupOrder: 200,
    width: 3,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: true,
  })
  @Property({ length: 256, nullable: false })
  filename!: string;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 300,
    group: 'aiChatAttachment.groupFile',
    groupOrder: 200,
    width: 2,
    visible: true,
    tableOrder: 300,
    tableVisible: false,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ length: 128, nullable: true })
  mimeType?: string | null;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 400,
    group: 'aiChatAttachment.groupFile',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 400,
    tableVisible: true,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @Property({ nullable: true })
  byteLength?: number | null;

  @ApiPropertyOptional({ default: 'analyzed' })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 500,
    group: 'aiChatAttachment.groupFile',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 500,
    tableVisible: true,
    mobileOrder: 500,
    mobileVisible: true,
  })
  @Property({ length: 32, nullable: false, default: 'analyzed' })
  status = 'analyzed';

  @ApiPropertyOptional()
  @SaplingForm({
    order: 100,
    group: 'aiChatAttachment.groupPayload',
    groupOrder: 300,
    width: 4,
    visible: true,
    tableOrder: 100,
    tableVisible: false,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  summaryPayload?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 200,
    group: 'aiChatAttachment.groupPayload',
    groupOrder: 300,
    width: 4,
    visible: true,
    tableOrder: 200,
    tableVisible: false,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  errorPayload?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
