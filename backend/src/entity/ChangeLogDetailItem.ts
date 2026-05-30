import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type Rel } from '@mikro-orm/core';
import { ChangeLogItem } from './ChangeLogItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

@Entity()
export class ChangeLogDetailItem {
  @ApiProperty()
  @Sapling(['isOrderASC'])
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty({ type: () => ChangeLogItem })
  @Sapling(['isHideAsReference'])
  @SaplingForm({
    order: 100,
    group: 'changeLogDetail.groupReference',
    groupOrder: 200,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @ManyToOne(() => ChangeLogItem, { nullable: false })
  log!: Rel<ChangeLogItem>;

  @ApiProperty()
  @Sapling(['isValue'])
  @SaplingForm({
    order: 100,
    group: 'changeLogDetail.groupContent',
    groupOrder: 100,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ length: 256, nullable: false })
  property!: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @SaplingForm({
    order: 200,
    group: 'changeLogDetail.groupContent',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  oldValue?: unknown;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @SaplingForm({
    order: 300,
    group: 'changeLogDetail.groupContent',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  newValue?: unknown;

  // #region Properties: System
  /**
   * Date and time when the company was created.
   * @type {Date}
   */
  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the company was last updated.
   * @type {Date}
   */
  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
