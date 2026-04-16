import { Collection } from '@mikro-orm/core';
import {
  Entity,
  OneToMany,
  ManyToOne,
  Property,
} from '@mikro-orm/decorators/legacy';
import { EntityGroupItem } from './EntityGroupItem';
import { KpiItem } from './KpiItem';
import { FavoriteItem } from './FavoriteItem';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';
import { WebhookSubscriptionItem } from './WebhookSubscriptionItem';
import { DocumentItem } from './DocumentItem';
import { EntityRouteItem } from './EntityRouteItem';
import { ScriptButtonItem } from './ScriptButtonItem';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Entity representing a generic entity in the system, including persisted properties, permissions, relations, and system fields.
 *
 * @property        {string}                        handle          Unique identifier for the entity (primary key)
 * @property        {string}                        icon            Icon representing the entity (default: square-rounded)
 * @property        {boolean}                       canRead         Indicates if read operations are allowed for this entity
 * @property        {boolean}                       canInsert       Indicates if insert operations are allowed for this entity
 * @property        {boolean}                       canUpdate       Indicates if update operations are allowed for this entity
 * @property        {boolean}                       canDelete       Indicates if delete operations are allowed for this entity
 * @property        {boolean}                       canShow         Indicates if show permissions can be revoked for this entity
 * @property        {EntityGroupItem}               group           The group this entity belongs to (optional)
 * @property        {Collection<KpiItem>}           kpis            KPIs associated with this entity
 * @property        {Collection<KpiItem>}           kpiRelations    KPIs associated with this entity (relation)
 * @property        {Collection<FavoriteItem>}      favorites       Favorite items referencing this entity
 * @property        {Collection<WebhookSubscriptionItem>} subscriptions KPIs associated with this entity (subscriptions)
 * @property        {Collection<DocumentItem>}      documents       Documents associated with this entity
 * @property        {Collection<EntityRouteItem>}   routes          Routes belonging to this entity
 * @property        {Collection<ScriptButtonItem>}  scriptButtons   Script buttons belonging to this entity
 * @property        {Date}                          createdAt       Date and time when the entity was created
 * @property        {Date}                          updatedAt       Date and time when the entity was last updated
 */
@Entity()
export class EntityItem {
  // #region Properties: Persisted
  /**
   * Unique identifier for the entity (primary key).
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC', 'isEntity'])
  @Property({ primary: true, length: 64 })
  handle!: string;

  /**
   * Icon representing the entity (default: square-rounded).
   * @type {string}
   */
  @ApiProperty()
  @Sapling(['isIcon'])
  @Property({ default: 'square-rounded', length: 64, nullable: false })
  icon?: string = 'square-rounded';

  /**
   * Indicates if read operations are allowed for this entity.
   * @type {boolean}
   */
  @ApiProperty()
  @Property({ default: true })
  canRead: boolean = true;

  /**
   * Indicates if insert operations are allowed for this entity.
   * @type {boolean}
   */
  @ApiProperty()
  @Property({ default: false })
  canInsert: boolean = false;

  /**
   * Indicates if update operations are allowed for this entity.
   * @type {boolean}
   */
  @ApiProperty()
  @Property({ default: false })
  canUpdate: boolean = false;

  /**
   * Indicates if delete operations are allowed for this entity.
   * @type {boolean}
   */
  @ApiProperty()
  @Property({ default: false })
  canDelete: boolean = false;

  /**
   * Indicates if show permissions can be revoked for this entity.
   * @type {boolean}
   */
  @ApiProperty()
  @Property({ default: false })
  canShow: boolean = false;
  // #endregion

  // #region Properties: Relation
  /**
   * The group this entity belongs to (optional).
   * @type {EntityGroupItem}
   */
  @ApiPropertyOptional({ type: () => EntityGroupItem })
  @ManyToOne(() => EntityGroupItem, { nullable: true })
  group?: EntityGroupItem;

  /**
   * KPIs associated with this entity.
   * @type {Collection<KpiItem>}
   */
  @ApiPropertyOptional({ type: () => KpiItem, isArray: true })
  @Sapling(['isHideAsReference'])
  @OneToMany(() => KpiItem, (x) => x.targetEntity)
  kpis: Collection<KpiItem> = new Collection<KpiItem>(this);

  /**
   * KPIs associated with this entity (relation).
   * @type {Collection<KpiItem>}
   */
  @ApiPropertyOptional({ type: () => KpiItem, isArray: true })
  @Sapling(['isHideAsReference'])
  @OneToMany(() => KpiItem, (x) => x.relation)
  kpiRelations: Collection<KpiItem> = new Collection<KpiItem>(this);

  /**
   * Favorite items referencing this entity.
   * @type {Collection<FavoriteItem>}
   */
  @ApiPropertyOptional({ type: () => FavoriteItem, isArray: true })
  @OneToMany(() => FavoriteItem, (favorite) => favorite.entity)
  favorites: Collection<FavoriteItem> = new Collection<FavoriteItem>(this);

  /**
   * KPIs associated with this entity (subscriptions).
   * @type {Collection<WebhookSubscriptionItem>}
   */
  @ApiPropertyOptional({ type: () => WebhookSubscriptionItem, isArray: true })
  @OneToMany(() => WebhookSubscriptionItem, (x) => x.entity)
  subscriptions: Collection<WebhookSubscriptionItem> =
    new Collection<WebhookSubscriptionItem>(this);

  /**
   * Documents associated with this entity.
   * @type {Collection<DocumentItem>}
   */
  @ApiPropertyOptional({ type: () => DocumentItem, isArray: true })
  @Sapling(['isHideAsReference'])
  @OneToMany(() => DocumentItem, (x) => x.entity)
  documents: Collection<DocumentItem> = new Collection<DocumentItem>(this);

  /**
   * Routes belonging to this entity.
   * @type {Collection<EntityRouteItem>}
   */
  @ApiPropertyOptional({ type: () => EntityRouteItem, isArray: true })
  @OneToMany(() => EntityRouteItem, (x) => x.entity)
  routes: Collection<EntityRouteItem> = new Collection<EntityRouteItem>(this);

  /**
   * Script buttons belonging to this entity.
   * @type {Collection<ScriptButtonItem>}
   */
  @ApiPropertyOptional({ type: () => ScriptButtonItem, isArray: true })
  @OneToMany(() => ScriptButtonItem, (x) => x.entity)
  scriptButtons: Collection<ScriptButtonItem> =
    new Collection<ScriptButtonItem>(this);
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the entity was created.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the entity was last updated.
   * @type {Date}
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
