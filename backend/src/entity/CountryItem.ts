import {
  Entity,
  PrimaryKey,
  OneToMany,
  Collection,
  Property,
} from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';
import { CompanyItem } from './CompanyItem';

/**
 * Entity representing a KPI Date Comparison Type (e.g., YEAR, QUARTER, MONTH, WEEK, DAY)
 */
@Entity()
export class CountryItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the country (primary key).
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @PrimaryKey({ length: 64 })
  handle!: string;

  /**
   * Name of the country.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact'])
  @Property({ length: 256, nullable: false })
  name!: string;

  //#endregion

  //#region Properties: Relation
  @ApiProperty({ type: () => CompanyItem, isArray: true })
  @OneToMany(() => CompanyItem, (x) => x.country)
  companies = new Collection<CompanyItem>(this);
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
