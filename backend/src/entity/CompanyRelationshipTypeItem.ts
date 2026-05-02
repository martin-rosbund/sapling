import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompanyRelationshipItem } from './CompanyRelationshipItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a company relationship type, including persisted properties, relations, and system fields.
 *
 * @property        {string}                           handle                Unique identifier for the relationship type (primary key)
 * @property        {string}                           title                 Title or name of the relationship type
 * @property        {string}                           icon                  Icon representing the relationship type
 * @property        {string}                           color                 Color used for displaying the relationship type
 * @property        {Collection<CompanyRelationshipItem>} relationships      Company relationships assigned to this type
 * @property        {Date}                             createdAt             Date and time when the relationship type was created
 * @property        {Date}                             updatedAt             Date and time when the relationship type was last updated
 */
@Entity()
export class CompanyRelationshipTypeItem {
  // #region Properties: Persisted
  /**
   * Unique identifier for the relationship type (primary key).
   * @type {string}
   */
  @ApiProperty()
  @Property({ primary: true, length: 64 })
  handle!: string;

  /**
   * Title or name of the relationship type.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'companyRelationshipType.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 128, nullable: false })
  title!: string;

  /**
   * Icon representing the relationship type.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isIcon'])
  @SaplingForm({
    order: 100,
    group: 'companyRelationshipType.groupAppearance',
    groupOrder: 200,
    width: 1,
  })
  @Property({ default: 'mdi-family-tree', length: 64, nullable: false })
  icon?: string = 'mdi-family-tree';

  /**
   * Color used for displaying the relationship type.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isColor'])
  @SaplingForm({
    order: 200,
    group: 'companyRelationshipType.groupAppearance',
    groupOrder: 200,
    width: 1,
  })
  @Property({ default: '#00897B', length: 32, nullable: false })
  color!: string;
  // #endregion

  // #region Properties: Relation
  /**
   * Company relationships assigned to this type.
   * @type {Collection<CompanyRelationshipItem>}
   */
  @ApiPropertyOptional({ type: () => CompanyRelationshipItem, isArray: true })
  @OneToMany(() => CompanyRelationshipItem, (relationship) => relationship.type)
  relationships: Collection<CompanyRelationshipItem> =
    new Collection<CompanyRelationshipItem>(this);
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the relationship type was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the relationship type was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
