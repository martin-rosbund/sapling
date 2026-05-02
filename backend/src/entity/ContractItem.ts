import { Collection } from '@mikro-orm/core';
import {
  Entity,
  ManyToMany,
  ManyToOne,
  Property,
} from '@mikro-orm/decorators/legacy';
import { ProductItem } from './ProductItem';
import { CompanyItem } from './CompanyItem';
import { ContractServiceItem } from './ContractServiceItem';
import { SupportQueueItem } from './SupportQueueItem';
import { SupportTeamItem } from './SupportTeamItem';
import { SlaPolicyItem } from './SlaPolicyItem';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type Rel } from '@mikro-orm/core';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a contract, including persisted properties, relations, and system fields.
 *
 * @property        {number}                handle              Unique identifier for the contract (primary key)
 * @property        {string}                title               Title of the contract
 * @property        {string}                description         Description of the contract
 * @property        {Date}                  startDate           Start date of the contract
 * @property        {Date}                  endDate             End date of the contract (optional)
 * @property        {boolean}               isActive            Indicates if the contract is active
 * @property        {number}                annualIncludedHours Annual included hours/contingent (default: 0)
 * @property        {boolean}               hasUpdateservice    Indicates if the contract includes an update service (default: false)
 * @property        {CompanyItem}           company             The company associated with this contract
 * @property        {Collection<ProductItem>} products          Products associated with this contract
 * @property        {Date}                  createdAt           Date and time when the contract was created
 * @property        {Date}                  updatedAt           Date and time when the contract was last updated
 */
@Entity()
export class ContractItem {
  // #region Properties: Persisted
  /**
   * Unique identifier for the contract (primary key).
   * @type {number}
   */
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  /**
   * Title of the contract.
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC', 'isDuplicateCheck'])
  @SaplingForm({
    order: 100,
    group: 'contract.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 128, nullable: false })
  title!: string;

  /**
   * Description of the contract.
   * @type {string}
   */
  @ApiPropertyOptional()
  @Sapling(['isDuplicateCheck'])
  @SaplingForm({
    order: 100,
    group: 'contract.groupContent',
    groupOrder: 200,
    width: 4,
  })
  @Property({ nullable: true, length: 512 })
  description?: string;

  /**
   * Start date of the contract.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isToday', 'isDateStart'])
  @SaplingForm({
    order: 100,
    group: 'contract.groupSchedule',
    groupOrder: 300,
    width: 1,
  })
  @Property({ type: 'datetime', nullable: false })
  startDate!: Date;

  /**
   * End date of the contract (optional).
   * @type {Date}
   */
  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isDeadline', 'isDateEnd'])
  @SaplingForm({
    order: 200,
    group: 'contract.groupSchedule',
    groupOrder: 300,
    width: 1,
  })
  @Property({ type: 'datetime', nullable: true })
  endDate?: Date;

  /**
   * Date of the most recent service (optional).
   * @type {Date}
   */
  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isToday'])
  @SaplingForm({
    order: 300,
    group: 'contract.groupSchedule',
    groupOrder: 300,
    width: 1,
  })
  @Property({ type: 'datetime', nullable: true })
  lastServiceDate?: Date;

  /**
   * Date of the next scheduled service (optional).
   * @type {Date}
   */
  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isDeadline'])
  @SaplingForm({
    order: 400,
    group: 'contract.groupSchedule',
    groupOrder: 300,
    width: 1,
  })
  @Property({ type: 'datetime', nullable: true })
  nextServiceDate?: Date;

  /**
   * Indicates if the contract is active.
   * @type {boolean}
   */
  @ApiProperty()
  @SaplingForm({
    order: 100,
    group: 'contract.groupConfiguration',
    groupOrder: 400,
    width: 1,
  })
  @Property({ default: true, nullable: false })
  isActive: boolean = true;

  /**
   * Annual included hours/contingent (default: 0).
   * @type {number}
   */
  @ApiProperty()
  @SaplingForm({
    order: 300,
    group: 'contract.groupBasics',
    groupOrder: 100,
    width: 1,
  })
  @Property({ default: 0, nullable: false })
  annualIncludedHours: number = 0;

  /**
   * Indicates if the contract includes an update service (default: false).
   * @type {boolean}
   */
  @ApiProperty()
  @SaplingForm({
    order: 500,
    group: 'contract.groupSchedule',
    groupOrder: 300,
    width: 1,
  })
  @Property({ default: false, nullable: false })
  hasUpdateservice: boolean = false;
  // #endregion

  // #region Properties: Relation
  /**
   * The company associated with this contract.
   * @type {CompanyItem}
   */
  @ApiPropertyOptional({ type: () => CompanyItem })
  @Sapling(['isCompany'])
  @SaplingForm({
    order: 100,
    group: 'contract.groupReference',
    groupOrder: 500,
    width: 2,
  })
  @ManyToOne(() => CompanyItem, { nullable: true })
  company?: Rel<CompanyItem>;

  /**
   * Service level assigned to this contract.
   * @type {ContractServiceItem}
   */
  @ApiPropertyOptional({ type: () => ContractServiceItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 200,
    group: 'contract.groupReference',
    groupOrder: 500,
    width: 1,
  })
  @ManyToOne(() => ContractServiceItem, { nullable: true })
  serviceLevel?: Rel<ContractServiceItem>;

  /**
   * Default support team for tickets created under this contract.
   * @type {SupportTeamItem}
   */
  @ApiPropertyOptional({ type: () => SupportTeamItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 300,
    group: 'contract.groupReference',
    groupOrder: 500,
    width: 1,
  })
  @ManyToOne(() => SupportTeamItem, { nullable: true })
  defaultSupportTeam?: Rel<SupportTeamItem>;

  /**
   * Default support queue for tickets created under this contract.
   * @type {SupportQueueItem}
   */
  @ApiPropertyOptional({ type: () => SupportQueueItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 400,
    group: 'contract.groupReference',
    groupOrder: 500,
    width: 1,
  })
  @ManyToOne(() => SupportQueueItem, { nullable: true })
  defaultSupportQueue?: Rel<SupportQueueItem>;

  /**
   * SLA policy applied to service tickets linked to this contract.
   * @type {SlaPolicyItem}
   */
  @ApiPropertyOptional({ type: () => SlaPolicyItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 500,
    group: 'contract.groupReference',
    groupOrder: 500,
    width: 1,
  })
  @ManyToOne(() => SlaPolicyItem, { nullable: true })
  slaPolicy?: Rel<SlaPolicyItem>;

  /**
   * Products associated with this contract.
   * @type {Collection<ProductItem>}
   */
  @ApiPropertyOptional({ type: () => ProductItem, isArray: true })
  @ManyToMany(() => ProductItem)
  products: Collection<ProductItem> = new Collection<ProductItem>(this);
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the contract was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the contract was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
