import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntityItem } from './EntityItem';
import { DocumentTypeItem } from './DocumentTypeItem';
import { Sapling } from './global/entity.decorator';

@Entity()
export class DocumentItem {
  //#region Properties: Persisted
  @ApiProperty()
  @PrimaryKey({ autoincrement: true })
  handle!: number;

  @ApiProperty()
  @Property({ length: 64 })
  ownerHandle!: string;

  @ApiProperty()
  @Property({ length: 512 })
  path!: string;

  @ApiProperty()
  @Property({ length: 256 })
  filename!: string;

  @ApiProperty()
  @Property({ length: 128 })
  mimetype!: string;

  @ApiProperty()
  @Property()
  length!: number;

  @ApiPropertyOptional()
  @Property({ nullable: true, length: 256 })
  description?: string;
  //#endregion

  //#region Properties: Relation
  @ApiProperty({ type: () => EntityItem })
  @ManyToOne(() => EntityItem)
  entity!: EntityItem;

  @ApiProperty()
  @ManyToOne(() => DocumentTypeItem)
  type!: DocumentTypeItem;
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the dashboard was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the dashboard was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  //#endregion
}
