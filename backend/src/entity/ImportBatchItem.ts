import { Collection, type Rel } from '@mikro-orm/core';
import {
  Entity,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntityItem } from './EntityItem';
import { PersonItem } from './PersonItem';
import {
  Sapling,
  SaplingDependsOn,
  SaplingForm,
} from './global/entity.decorator';
import { ImportSourceItem } from './ImportSourceItem';
import { ImportBatchRowItem } from './ImportBatchRowItem';
import { ImportTemplateItem } from './ImportTemplateItem';

@Entity()
export class ImportBatchItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiPropertyOptional({ type: () => ImportSourceItem })
  @SaplingForm({
    order: 100,
    group: 'importBatch.groupReference',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @ManyToOne(() => ImportSourceItem, { nullable: true })
  source?: Rel<ImportSourceItem> | null;

  @ApiPropertyOptional({ type: () => EntityItem })
  @Sapling(['isEntity'])
  @SaplingForm({
    order: 200,
    group: 'importBatch.groupReference',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: true,
  })
  @ManyToOne(() => EntityItem, { nullable: true })
  targetEntity?: Rel<EntityItem> | null;

  @ApiPropertyOptional({ type: () => ImportTemplateItem })
  @SaplingForm({
    order: 250,
    group: 'importBatch.groupReference',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 250,
    tableVisible: true,
    mobileOrder: 250,
    mobileVisible: false,
  })
  @SaplingDependsOn({
    parentField: 'source',
    targetField: 'source',
    requireParent: true,
    clearOnParentChange: true,
  })
  @ManyToOne(() => ImportTemplateItem, { nullable: true })
  importTemplate?: Rel<ImportTemplateItem> | null;

  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson', 'isPartner', 'isCurrentPerson'])
  @SaplingForm({
    order: 300,
    group: 'importBatch.groupReference',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @ManyToOne(() => PersonItem, { nullable: false })
  createdBy!: Rel<PersonItem>;

  @ApiProperty()
  @Sapling(['isValue'])
  @SaplingForm({
    order: 100,
    group: 'importBatch.groupFile',
    groupOrder: 200,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ length: 256 })
  filename!: string;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 200,
    group: 'importBatch.groupFile',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: false,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ length: 128, nullable: true })
  mimetype?: string;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 300,
    group: 'importBatch.groupFile',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ nullable: true })
  fileSize?: number;

  @ApiProperty()
  @Sapling(['isChip'])
  @SaplingForm({
    order: 100,
    group: 'importBatch.groupState',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ length: 32, default: 'analyzed' })
  status: string = 'analyzed';

  @ApiPropertyOptional()
  @Sapling(['isChip'])
  @SaplingForm({
    order: 150,
    group: 'importBatch.groupState',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 150,
    tableVisible: true,
    mobileOrder: 150,
    mobileVisible: true,
  })
  @Property({ length: 32, nullable: true })
  currentOperation?: string | null;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 200,
    group: 'importBatch.groupState',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ nullable: true })
  rowCount?: number;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 250,
    group: 'importBatch.groupState',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 250,
    tableVisible: true,
    mobileOrder: 250,
    mobileVisible: false,
  })
  @Property({ default: 0 })
  processedCount: number = 0;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 300,
    group: 'importBatch.groupState',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ default: 0 })
  readyCount: number = 0;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 400,
    group: 'importBatch.groupState',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 400,
    tableVisible: true,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @Property({ default: 0 })
  errorCount: number = 0;

  @ApiPropertyOptional()
  @Property({ default: 0 })
  createdCount: number = 0;

  @ApiPropertyOptional()
  @Property({ default: 0 })
  updatedCount: number = 0;

  @ApiPropertyOptional()
  @Property({ default: 0 })
  skippedCount: number = 0;

  @ApiPropertyOptional()
  @Property({ default: 0 })
  failedCount: number = 0;

  @ApiPropertyOptional()
  @Property({ length: 128, nullable: true })
  jobId?: string | null;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @SaplingForm({
    order: 450,
    group: 'importBatch.groupState',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 450,
    tableVisible: false,
    mobileOrder: 450,
    mobileVisible: false,
  })
  @Property({ nullable: true, type: 'datetime' })
  startedAt?: Date | null;

  @ApiPropertyOptional()
  @Property({ length: 8, nullable: true })
  delimiter?: string;

  @ApiPropertyOptional({ type: [String] })
  @Property({ type: 'json', nullable: true })
  headers?: string[];

  @ApiPropertyOptional()
  @Property({ type: 'json', nullable: true })
  sampleRows?: Record<string, unknown>[];

  @ApiPropertyOptional()
  @Property({ type: 'json', nullable: true })
  mapping?: object;

  @ApiPropertyOptional({ type: [String] })
  @Property({ type: 'json', nullable: true })
  externalKeyColumns?: string[];

  @ApiPropertyOptional()
  @Property({ type: 'json', nullable: true })
  genericReferenceMapping?: object | null;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @SaplingForm({
    order: 500,
    group: 'importBatch.groupState',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 500,
    tableVisible: true,
    mobileOrder: 500,
    mobileVisible: false,
  })
  @Property({ nullable: true, type: 'datetime' })
  executedAt?: Date;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @SaplingForm({
    order: 600,
    group: 'importBatch.groupState',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 600,
    tableVisible: true,
    mobileOrder: 600,
    mobileVisible: false,
  })
  @Property({ nullable: true, type: 'datetime' })
  completedAt?: Date | null;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @SaplingForm({
    order: 700,
    group: 'importBatch.groupState',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 700,
    tableVisible: true,
    mobileOrder: 700,
    mobileVisible: false,
  })
  @Property({ nullable: true, type: 'datetime' })
  failedAt?: Date | null;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 800,
    group: 'importBatch.groupState',
    groupOrder: 300,
    width: 4,
    visible: true,
    tableOrder: 800,
    tableVisible: false,
    mobileOrder: 800,
    mobileVisible: false,
  })
  @Property({ type: 'text', nullable: true })
  lastError?: string | null;

  @ApiPropertyOptional({ type: () => ImportBatchRowItem, isArray: true })
  @OneToMany(() => ImportBatchRowItem, (row) => row.batch)
  rows: Collection<Rel<ImportBatchRowItem>> = new Collection<
    Rel<ImportBatchRowItem>
  >(this);

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
