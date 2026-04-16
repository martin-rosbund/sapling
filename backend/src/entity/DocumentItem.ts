import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntityItem } from './EntityItem';
import { DocumentTypeItem } from './DocumentTypeItem';
import { Sapling } from './global/entity.decorator';
import { PersonItem } from './PersonItem';
import { type Rel } from '@mikro-orm/core';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a document, including persisted properties, relations, and system fields.
 *
 * @property        {number}            handle      Unique identifier for the document (primary key)
 * @property        {string}            reference    Reference string for the document
 * @property        {string}            path        Path to the document file
 * @property        {string}            filename    Filename of the document
 * @property        {string}            mimetype    MIME type of the document
 * @property        {number}            length      Length (size) of the document in bytes
 * @property        {string}            description Description of the document (optional)
 * @property        {EntityItem}        entity      Entity associated with this document
 * @property        {DocumentTypeItem}  type        Type of the document
 * @property        {Date}              createdAt   Date and time when the document was created
 * @property        {Date}              updatedAt   Date and time when the document was last updated
 */
@Entity()
export class DocumentItem {
  // #region Properties: Persisted
  /**
   * Unique identifier for the document (primary key).
   * @type {number}
   */
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle!: number;

  /**
   * Reference string for the document.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isSystem'])
  @Property({ length: 64 })
  reference!: string;

  /**
   * Path to the document file.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isSystem'])
  @Property({ length: 128 })
  path!: string;

  /**
   * Filename of the document.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isSystem'])
  @Property({ length: 256 })
  filename!: string;

  /**
   * MIME type of the document.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isSystem'])
  @Property({ length: 128 })
  mimetype!: string;

  /**
   * Length (size) of the document in bytes.
   * @type {number}
   */
  @ApiProperty()
  @Sapling(['isSystem'])
  @Property()
  length!: number;

  /**
   * Description of the document (optional).
   * @type {string}
   */
  @ApiPropertyOptional()
  @Property({ nullable: true, length: 256 })
  description?: string;
  // #endregion

  // #region Properties: Relation
  /**
   * Entity associated with this document.
   * @type {EntityItem}
   */
  @ApiProperty({ type: () => EntityItem })
  @Sapling(['isEntity', 'isReadOnly'])
  @ManyToOne(() => EntityItem)
  entity!: Rel<EntityItem>;

  /**
   * Type of the document.
   * @type {DocumentTypeItem}
   */
  @ApiProperty()
  @ManyToOne(() => DocumentTypeItem)
  type!: DocumentTypeItem;

  /**
   * Reference to the person (not null).
   * @type {PersonItem}
   */
  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson', 'isPartner', 'isCurrentPerson'])
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: Rel<PersonItem>;
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the document was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the document was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
