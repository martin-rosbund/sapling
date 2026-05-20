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
import { ChangeLogDetailItem } from './ChangeLogDetailItem';
import { ChangeLogActionItem } from './ChangeLogActionItem';
import {
  Sapling,
  SaplingForm,
  SaplingGenericReference,
} from './global/entity.decorator';

@Entity()
export class ChangeLogItem {
  @ApiProperty()
  @Sapling(['isOrderASC'])
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty({ type: () => ChangeLogActionItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 100,
    group: 'changeLog.groupContent',
    groupOrder: 100,
    width: 1,
  })
  @ManyToOne(() => ChangeLogActionItem, { nullable: false })
  action!: Rel<ChangeLogActionItem>;

  @ApiProperty()
  @Sapling(['isSystem', 'isValue'])
  @SaplingGenericReference({ entityField: 'entity', handleField: 'reference' })
  @SaplingForm({
    order: 200,
    group: 'changeLog.groupContent',
    groupOrder: 100,
    width: 1,
  })
  @Property({ length: 64, nullable: false })
  reference!: string;

  @ApiProperty({ type: () => EntityItem })
  @Sapling(['isEntity'])
  @SaplingForm({
    order: 100,
    group: 'changeLog.groupReference',
    groupOrder: 200,
    width: 2,
  })
  @ManyToOne(() => EntityItem, { nullable: false })
  entity!: Rel<EntityItem>;

  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson', 'isPartner', 'isCurrentPerson'])
  @SaplingForm({
    order: 200,
    group: 'changeLog.groupReference',
    groupOrder: 200,
    width: 2,
  })
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: Rel<PersonItem>;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @SaplingForm({
    order: 300,
    group: 'changeLog.groupContent',
    groupOrder: 100,
    width: 2,
  })
  @Property({ type: 'json', nullable: true })
  oldPayload?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @SaplingForm({
    order: 400,
    group: 'changeLog.groupContent',
    groupOrder: 100,
    width: 2,
  })
  @Property({ type: 'json', nullable: true })
  newPayload?: Record<string, unknown> | null;

  @ApiProperty({ type: () => ChangeLogDetailItem, isArray: true })
  @Sapling(['isHideAsReference'])
  @OneToMany(() => ChangeLogDetailItem, (detail) => detail.log, {
    orphanRemoval: true,
  })
  details: Collection<ChangeLogDetailItem> =
    new Collection<ChangeLogDetailItem>(this);

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
