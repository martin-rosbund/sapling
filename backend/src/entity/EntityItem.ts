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
  @Sapling(['isShowInCompact'])
  @PrimaryKey({ length: 64 })
  handle: string;

  /**
   * Icon representing the entity (default: square-rounded).
   */
  @ApiProperty()
  @Sapling(['isIcon'])
  @Property({ default: 'square-rounded', length: 64, nullable: false })
  icon!: string | null;

  /**
   * Optional route for the entity (e.g., frontend path).
   */
  @ApiPropertyOptional()
  @Property({ nullable: true, length: 128 })
  route?: string | null;

  /**
   * Indicates if read operations are allowed for this entity.
   */
  @ApiProperty()
  @Property({ default: true })
  canRead!: boolean | null;

  /**
   * Indicates if insert operations are allowed for this entity.
   */
  @ApiProperty()
  @Property({ default: false })
  canInsert!: boolean | null;

  /**
   * Indicates if update operations are allowed for this entity.
   */
  @ApiProperty()
  @Property({ default: false })
  canUpdate!: boolean | null;

  /**
   * Indicates if delete operations are allowed for this entity.
   */
  @ApiProperty()
  @Property({ default: false })
  canDelete!: boolean | null;

  /**
   * Indicates if show permissions can be revoked for this entity.
   */
  @ApiProperty()
  @Property({ default: false })
  canShow!: boolean | null;
  //#endregion

  //#region Properties: Relation
  /**
   * The group this entity belongs to (optional).
   */
  @ApiPropertyOptional({ type: () => EntityGroupItem })
  @ManyToOne(() => EntityGroupItem, { nullable: true })
  group!: EntityGroupItem | null;

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
   * Date and time when the entity was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt: Date | null = new Date();

  /**
   * Date and time when the entity was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt: Date | null = new Date();
  //#endregion
}
