import { Entity, Property, OneToOne } from '@mikro-orm/core';
import { ApiProperty } from '@nestjs/swagger';
import { PersonItem } from './PersonItem';
import { Sapling } from './global/entity.decorator';

/**
 * @class PersonSessionItem
 * @version 1.0
 * @author Martin Rosbund
 * @summary Entity representing a person session.
 * @description Contains session details and relations to person. Used to manage authentication sessions for users.
 *
 * @property {string} number - Session number for the session (not primary key).
 * @property {string} accessToken - Access token for the session.
 * @property {string} refreshToken - Refresh token for the session.
 * @property {PersonItem} person - The person this session belongs to (also primary key, one-to-one).
 * @property {Date} createdAt - Date and time when the session was created.
 * @property {Date} updatedAt - Date and time when the session was last updated.
 */
@Entity()
export class PersonSessionItem {
  //#region Properties: Persisted
  /**
   * Session number for the session (not primary key).
   */
  @ApiProperty()
  @Sapling(['isSecurity', 'isOrderASC'])
  @Property({ length: 128, nullable: false })
  number!: string;

  /**
   * Access token for the session.
   */
  @ApiProperty()
  @Sapling(['isSecurity'])
  @Property({ length: 2048, nullable: false })
  accessToken!: string;

  /**
   * Access token for the session.
   */
  @ApiProperty()
  @Sapling(['isSecurity'])
  @Property({ length: 2048, nullable: false })
  refreshToken!: string;
  //#endregion

  //#region Properties: Relation
  /**
   * The person this session belongs to (also primary key, one-to-one).
   */
  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson'])
  @OneToOne(() => PersonItem, { primary: true, nullable: false })
  person!: PersonItem;
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
