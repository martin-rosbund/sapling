import {
  Entity,
  PrimaryKey,
  Property,
  Collection,
  OneToMany,
} from '@mikro-orm/core';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';
import { SalesOpportunityItem } from './SalesOpportunityItem';

/**
 * Entity representing a sales opportunity source.
 * Contains source details and relations to sales opportunities.
 */
@Entity()
export class SalesOpportunitySourceItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the sales opportunity source (primary key).
   */
  @ApiProperty()
  @PrimaryKey({ autoincrement: true })
  handle?: number;

  /**
   * Title of the sales opportunity source.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 128, nullable: false })
  title: string;

  /**
   * Name of the sales opportunity source.
   */
  @ApiProperty()
  @Property({ length: 64, nullable: false })
  name: string;
  //#endregion

  //#region Properties: Relation
  /**
   * Sales opportunities associated with this sales opportunity type.
   */
  @ApiPropertyOptional({ type: () => SalesOpportunityItem, isArray: true })
  @OneToMany(() => SalesOpportunityItem, (x) => x.source)
  salesOpportunities = new Collection<SalesOpportunityItem>(this);
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the sales opportunity was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the sales opportunity was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  //#endregion
}
