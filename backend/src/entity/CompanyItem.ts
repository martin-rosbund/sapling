import {
  Collection,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { PersonItem } from './PersonItem';
import { ContractItem } from './ContractItem';
import { WorkHourWeekItem } from './WorkHourWeekItem';
import { Sapling } from './global/entity.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Entity representing a company.
 * Contains company details and relations to persons and contracts.
 */
@Entity()
export class CompanyItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the company (primary key).
   */
  @ApiProperty()
  @Sapling(['isCompany'])
  @PrimaryKey({ autoincrement: true })
  handle!: number;

  /**
   * Name of the company (must be unique).
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isNavigation', 'isOrderASC'])
  @Property({ unique: true, length: 128, nullable: false })
  name: string;

  /**
   * Street address of the company.
   */
  @ApiProperty()
  @Sapling(['isNavigation'])
  @Property({ length: 128, nullable: false })
  street: string;

  /**
   * ZIP or postal code.
   */
  @ApiPropertyOptional()
  @Sapling(['isNavigation'])
  @Property({ length: 16, nullable: true })
  zip?: string | null;

  /**
   * City where the company is located.
   */
  @ApiPropertyOptional()
  @Sapling(['isNavigation'])
  @Property({ length: 64, nullable: true })
  city?: string | null;

  /**
   * Company phone number.
   */
  @ApiPropertyOptional()
  @Sapling(['isPhone'])
  @Property({ length: 32, nullable: true })
  phone?: string | null;

  /**
   * Company email address.
   */
  @ApiPropertyOptional()
  @Sapling(['isMail'])
  @Property({ length: 128, nullable: true })
  email?: string | null;

  /**
   * Company website URL.
   */
  @ApiPropertyOptional()
  @Sapling(['isLink'])
  @Property({ length: 128, nullable: true })
  website?: string | null;

  /**
   * Indicates if the company is active.
   */
  @ApiProperty()
  @Property({ default: true, nullable: false })
  isActive!: boolean | null;
  //#endregion

  //#region Properties: Relation
  /**
   * Persons associated with this company.
   */
  @ApiPropertyOptional({ type: () => PersonItem, isArray: true })
  @OneToMany(() => PersonItem, (x) => x.company)
  persons = new Collection<PersonItem>(this);

  /**
   * Contracts associated with this company.
   */
  @ApiPropertyOptional({ type: () => ContractItem, isArray: true })
  @OneToMany(() => ContractItem, (x) => x.company)
  contracts = new Collection<ContractItem>(this);

  /**
   * The work hour week this company uses (optional).
   */
  @ApiPropertyOptional({ type: () => WorkHourWeekItem })
  @ManyToOne(() => WorkHourWeekItem, { nullable: true })
  workWeek!: WorkHourWeekItem | null;
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the company was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the company was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
