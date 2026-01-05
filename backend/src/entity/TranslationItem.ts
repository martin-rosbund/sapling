import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { LanguageItem } from './LanguageItem';
import { ApiProperty } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';

@Entity()
export class TranslationItem {
  //#region Properties: Persisted
  /**
   * Entity name to which this translation belongs (e.g., 'Ticket', 'Note').
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @PrimaryKey({ length: 64 })
  entity!: string;

  /**
   * Property name of the entity being translated (e.g., 'description').
   */
  @ApiProperty()
  @Sapling(['isShowInCompact'])
  @PrimaryKey({ length: 64 })
  property: string;

  /**
   * Translated value for the property.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact'])
  @Property({ length: 1024, nullable: false })
  value: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Language for this translation.
   */
  @ApiProperty({ type: () => LanguageItem })
  @ManyToOne(() => LanguageItem, { primary: true })
  language!: LanguageItem;
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
