import { type Rel } from '@mikro-orm/core';
import {
  Entity,
  ManyToOne,
  Property,
  Unique,
} from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompanyItem } from './CompanyItem';
import { CompanyRelationshipTypeItem } from './CompanyRelationshipTypeItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a directed relationship between two companies, including persisted properties, relations, and system fields.
 *
 * @property        {number}                        handle          Unique identifier for the company relationship (primary key)
 * @property        {CompanyItem}                   sourceCompany   The source company of the relationship
 * @property        {CompanyItem}                   targetCompany   The target company of the relationship
 * @property        {CompanyRelationshipTypeItem}   type            The type of the relationship
 * @property        {string}                        description     Optional description of the relationship
 * @property        {Date}                          createdAt       Date and time when the relationship was created
 * @property        {Date}                          updatedAt       Date and time when the relationship was last updated
 */
@Entity()
@Unique({ properties: ['sourceCompany', 'targetCompany', 'type'] })
export class CompanyRelationshipItem {
  // #region Properties: Persisted
  /**
   * Unique identifier for the company relationship (primary key).
   * @type {number}
   */
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  /**
   * Optional description of the relationship.
   * @type {string}
   */
  @ApiPropertyOptional()
  @SaplingForm({
    order: 100,
    group: 'companyRelationship.groupContent',
    groupOrder: 100,
    width: 4,
  })
  @Property({ nullable: true, length: 1024 })
  description?: string;
  // #endregion

  // #region Properties: Relation
  /**
   * The source company of the relationship.
   * @type {CompanyItem}
   */
  @ApiProperty({ type: () => CompanyItem })
  @Sapling(['isCompany'])
  @SaplingForm({
    order: 100,
    group: 'companyRelationship.groupReference',
    groupOrder: 200,
    width: 1,
  })
  @ManyToOne(() => CompanyItem, { nullable: false })
  sourceCompany!: Rel<CompanyItem>;

  /**
   * The target company of the relationship.
   * @type {CompanyItem}
   */
  @ApiProperty({ type: () => CompanyItem })
  @Sapling(['isCompany'])
  @SaplingForm({
    order: 200,
    group: 'companyRelationship.groupReference',
    groupOrder: 200,
    width: 2,
  })
  @ManyToOne(() => CompanyItem, { nullable: false })
  targetCompany!: Rel<CompanyItem>;

  /**
   * The type of the relationship.
   * @type {CompanyRelationshipTypeItem}
   */
  @ApiProperty({ type: () => CompanyRelationshipTypeItem })
  @SaplingForm({
    order: 300,
    group: 'companyRelationship.groupReference',
    groupOrder: 200,
    width: 1,
  })
  @ManyToOne(() => CompanyRelationshipTypeItem, { nullable: false })
  type!: Rel<CompanyRelationshipTypeItem>;
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the relationship was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the relationship was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
