import { type Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { ImportBatchItem } from './ImportBatchItem';

@Entity()
export class ImportBatchRowItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty({ type: () => ImportBatchItem })
  @SaplingForm({
    order: 100,
    group: 'importBatchRow.groupReference',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @ManyToOne(() => ImportBatchItem, { nullable: false })
  batch!: Rel<ImportBatchItem>;

  @ApiProperty()
  @Sapling(['isValue'])
  @SaplingForm({
    order: 100,
    group: 'importBatchRow.groupBasics',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property()
  rowNumber!: number;

  @ApiProperty()
  @Sapling(['isChip'])
  @SaplingForm({
    order: 200,
    group: 'importBatchRow.groupBasics',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: true,
  })
  @Property({ length: 32, default: 'pending' })
  status: string = 'pending';

  @ApiPropertyOptional()
  @Sapling(['isChip'])
  @SaplingForm({
    order: 300,
    group: 'importBatchRow.groupBasics',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ length: 32, nullable: true })
  action?: string | null;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 400,
    group: 'importBatchRow.groupBasics',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 400,
    tableVisible: true,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @Property({ length: 64, nullable: true })
  targetReference?: string | null;

  @ApiPropertyOptional()
  @Property({ length: 128, nullable: true })
  externalKeyHash?: string | null;

  @ApiPropertyOptional()
  @Property({ type: 'json', nullable: true })
  externalKeyParts?: Record<string, unknown> | null;

  @ApiProperty()
  @Property({ type: 'json', nullable: false })
  rawData!: Record<string, unknown>;

  @ApiPropertyOptional()
  @Property({ type: 'json', nullable: true })
  payload?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 500,
    group: 'importBatchRow.groupBasics',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 500,
    tableVisible: true,
    mobileOrder: 500,
    mobileVisible: false,
  })
  @Property({ type: 'text', nullable: true })
  message?: string | null;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
