import {
  Collection,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { EntityGroupItem } from './EntityGroupItem';
import { KpiItem } from './KpiItem';
import { FavoriteItem } from './FavoriteItem';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';
import { WebhookSubscriptionItem } from './WebhookSubscriptionItem';

/**
 * Entity representing a generic entity in the system.
 * Contains entity details, permissions, and relations to groups and KPIs.
 */
@Entity()
export class EntityItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the entity (primary key).
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @PrimaryKey({ length: 64 })
  handle: string;

  /**
   * Icon representing the entity (default: square-rounded).
   */
  @ApiProperty()
  @Sapling(['isIcon'])
  @Property({ default: 'square-rounded', length: 64, nullable: false })
  icon?: string = 'square-rounded';

  /**
   * Optional route for the entity (e.g., frontend path).
   */
  @ApiPropertyOptional()
  @Property({ nullable: true, length: 128 })
  route?: string;

  /**
   * Indicates if read operations are allowed for this entity.
   */
  @ApiProperty()
  @Property({ default: true })
  canRead: boolean = true;

  /**
   * Indicates if insert operations are allowed for this entity.
   */
  @ApiProperty()
  @Property({ default: false })
  canInsert: boolean = false;

  /**
   * Indicates if update operations are allowed for this entity.
   */
  @ApiProperty()
  @Property({ default: false })
  canUpdate: boolean = false;

  /**
   * Indicates if delete operations are allowed for this entity.
   */
  @ApiProperty()
  @Property({ default: false })
  canDelete: boolean = false;

  /**
   * Indicates if show permissions can be revoked for this entity.
   */
  @ApiProperty()
  @Property({ default: false })
  canShow: boolean = false;
  //#endregion

  //#region Properties: Relation
  /**
   * The group this entity belongs to (optional).
   */
  @ApiPropertyOptional({ type: () => EntityGroupItem })
  @ManyToOne(() => EntityGroupItem, { nullable: true })
  group?: EntityGroupItem;

  /**
   * KPIs associated with this entity.
   */
  @ApiPropertyOptional({ type: () => KpiItem, isArray: true })
  @Sapling(['isHideAsReference'])
  @OneToMany(() => KpiItem, (x) => x.targetEntity)
  kpis = new Collection<KpiItem>(this);

  /**
   * KPIs associated with this entity.
   */
  @ApiPropertyOptional({ type: () => KpiItem, isArray: true })
  @Sapling(['isHideAsReference'])
  @OneToMany(() => KpiItem, (x) => x.relation)
  kpiRelations = new Collection<KpiItem>(this);

  /**
   * Favorite items referencing this entity.
   */
  @ApiPropertyOptional({ type: () => FavoriteItem, isArray: true })
  @OneToMany(() => FavoriteItem, (favorite) => favorite.entity)
  favorites = new Collection<FavoriteItem>(this);

  /**
   * KPIs associated with this entity.
   */
  @ApiPropertyOptional({ type: () => WebhookSubscriptionItem, isArray: true })
  @OneToMany(() => WebhookSubscriptionItem, (x) => x.entity)
  subscriptions = new Collection<WebhookSubscriptionItem>(this);
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
