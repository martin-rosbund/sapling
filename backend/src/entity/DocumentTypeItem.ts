import { Entity, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a document type, including persisted properties and system fields.
 *
 * @property        {string}    handle      Unique identifier for the document type (primary key)
 * @property        {string}    title       Title or name of the document type
 * @property        {string}    icon        Icon representing the document type (default: mdi-calendar)
 * @property        {string}    color       Color used for displaying the document type (default: #4CAF50)
 * @property        {Date}      createdAt   Date and time when the document type was created
 * @property        {Date}      updatedAt   Date and time when the document type was last updated
 */
@Entity()
export class DocumentTypeItem {
  // #region Properties: Persisted
  /**
   * Unique identifier for the document type (primary key).
   * @type {string}
   */
  @ApiProperty()
  @Property({ primary: true, length: 64 })
  handle!: string;

  /**
   * Title or name of the document type.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'documentType.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 128, nullable: false })
  title!: string;

  /**
   * Icon representing the document type (default: mdi-calendar).
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isIcon'])
  @SaplingForm({
    order: 100,
    group: 'documentType.groupAppearance',
    groupOrder: 200,
    width: 1,
  })
  @Property({ default: 'mdi-calendar', length: 64, nullable: false })
  icon?: string = 'mdi-calendar';

  /**
   * Color used for displaying the document type (default: #4CAF50).
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isColor'])
  @SaplingForm({
    order: 200,
    group: 'documentType.groupAppearance',
    groupOrder: 200,
    width: 1,
  })
  @Property({ default: '#4CAF50', length: 32, nullable: false })
  color!: string;
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the document type was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the document type was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
