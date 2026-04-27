import { Entity, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';

/**
 * @class SessionStoreItem
 * @summary Persisted express-session entry for durable server-side sessions.
 */
@Entity()
export class SessionStoreItem {
  // #region Properties: Persisted
  /**
   * Server-side session identifier.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'sessionStore.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ primary: true, length: 255, fieldName: 'handle' })
  handle!: string;

  /**
   * Serialized session payload.
   */
  @ApiProperty()
  @SaplingForm({
    order: 200,
    group: 'sessionStore.groupContent',
    groupOrder: 200,
    width: 4,
  })
  @Property({ type: 'json', nullable: false })
  payload!: string;

  /**
   * Absolute session expiration timestamp.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @SaplingForm({
    order: 300,
    group: 'sessionStore.groupSchedule',
    groupOrder: 300,
    width: 2,
  })
  @Property({ nullable: false, type: 'datetime', index: true })
  expiresAt!: Date;
  // #endregion

  // #region Properties: System
  /**
   * Creation timestamp.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Last update timestamp.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
