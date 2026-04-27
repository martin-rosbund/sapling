import { Entity, OneToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { PersonItem } from './PersonItem';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { type Rel } from '@mikro-orm/core';
import { EncryptedStringType } from './types/encrypted-string.type';

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
   * Unique identifier for the person session (primary key).
   */
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;
  /**
   * Session number for the person session (not primary key).
   */
  @ApiProperty()
  @Sapling(['isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'personSession.groupBasics',
    groupOrder: 100,
    width: 2,
  })
  @Property({ length: 128, nullable: false })
  number!: string;

  /**
   * Access token for the session. Persisted encrypted at rest.
   */
  @ApiHideProperty()
  @Sapling(['isSecurity'])
  @SaplingForm({
    order: 100,
    group: 'personSession.groupSecurity',
    groupOrder: 200,
    width: 4,
  })
  @Property({
    nullable: false,
    type: new EncryptedStringType(),
    hidden: true,
    columnType: 'text',
  })
  accessToken!: string;

  /**
   * Refresh token for the session. Persisted encrypted at rest.
   */
  @ApiHideProperty()
  @Sapling(['isSecurity'])
  @SaplingForm({
    order: 200,
    group: 'personSession.groupSecurity',
    groupOrder: 200,
    width: 4,
  })
  @Property({
    nullable: false,
    type: new EncryptedStringType(),
    hidden: true,
    columnType: 'text',
  })
  refreshToken!: string;
  //#endregion

  //#region Properties: Relation
  /**
   * The person this session belongs to (also primary key, one-to-one).
   */
  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson'])
  @SaplingForm({
    order: 100,
    group: 'personSession.groupReference',
    groupOrder: 300,
    width: 2,
  })
  @OneToOne(() => PersonItem, { nullable: false, unique: true })
  person!: Rel<PersonItem>;
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the person session was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the person session was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  //#endregion
}
