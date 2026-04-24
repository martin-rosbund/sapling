import { type Rel } from '@mikro-orm/core';
import {
  BeforeCreate,
  BeforeUpdate,
  Entity,
  ManyToOne,
  Property,
} from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PersonItem } from './PersonItem';
import { Sapling, SaplingForm } from './global/entity.decorator';
import * as crypto from 'crypto';

export const PERSON_API_TOKEN_HASH_INDICATOR = 'sha256$';
const PERSON_API_TOKEN_PREFIX_LENGTH = 10;

/**
 * @class
 * @version 1.0
 * @author Martin Rosbund
 * @summary Entity representing inbound API bearer tokens linked to a person.
 *
 * @property {number} handle Unique identifier for the token.
 * @property {string} description Human-readable description for the token.
 * @property {string} tokenPrefix Visible prefix for identifying the token.
 * @property {string} rawToken Non-persisted raw bearer token used only before hashing.
 * @property {string} tokenHash Hashed bearer token value.
 * @property {boolean} isActive Indicates if the token can still be used.
 * @property {Date} expiresAt Expiration timestamp for the token.
 * @property {Date} lastUsedAt Timestamp of the last successful use.
 * @property {string[] | null} allowedIps Optional list of allowed client IPs.
 * @property {PersonItem} person Person that owns the token.
 * @property {Date} createdAt Date and time when the token was created.
 * @property {Date} updatedAt Date and time when the token was last updated.
 */
@Entity()
export class PersonApiTokenItem {
  //#region Properties: Persisted
  /**
   * Unique identifier for the token.
   */
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  /**
   * Human-readable description for the token.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @SaplingForm({ order: 100, group: 'personApiToken.groupContent', width: 4 })
  @Property({ length: 128, nullable: false })
  description!: string;

  /**
   * Visible prefix for identifying the token without revealing it.
   */
  @ApiProperty()
  @Sapling(['isShowInCompact', 'isReadOnly', 'isSystem'])
  @Property({ length: 24, nullable: false })
  tokenPrefix!: string;

  /**
   * Non-persisted raw bearer token used only before hashing.
   */
  rawToken?: string;

  /**
   * Hashed bearer token value.
   */
  @ApiPropertyOptional()
  @Sapling(['isSecurity', 'isAutoKey'])
  @SaplingForm({ order: 100, group: 'personApiToken.groupSecurity', width: 2 })
  @Property({ length: 128, nullable: false, unique: true })
  tokenHash!: string;

  /**
   * Indicates if the token can still be used.
   */
  @ApiProperty()
  @SaplingForm({
    order: 100,
    group: 'personApiToken.groupConfiguration',
    width: 2,
  })
  @Property({ default: true, nullable: false })
  isActive = true;

  /**
   * Expiration timestamp for the token.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @SaplingForm({ order: 100, group: 'personApiToken.groupSchedule', width: 1 })
  @Property({ nullable: false, type: 'datetime' })
  expiresAt!: Date;

  /**
   * Timestamp of the last successful use.
   */
  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: true, type: 'datetime' })
  lastUsedAt?: Date;

  /**
   * Optional list of allowed client IPs.
   */
  @ApiPropertyOptional({ type: [String] })
  @SaplingForm({ order: 200, group: 'personApiToken.groupSecurity', width: 2 })
  @Property({ type: 'json', nullable: true })
  allowedIps?: string[];
  //#endregion

  //#region Properties: Relation
  /**
   * Person that owns the token.
   */
  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson'])
  @SaplingForm({ order: 100, group: 'personApiToken.groupReference', width: 2 })
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: Rel<PersonItem>;
  //#endregion

  //#region Properties: System
  /**
   * Date and time when the token was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the token was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  //#endregion

  //#region Functions: Helper
  /**
   * Hashes the token before saving if not already hashed.
   */
  @BeforeCreate()
  @BeforeUpdate()
  hashRawToken() {
    const tokenSource = this.rawToken ?? this.getPlaintextTokenHash();

    if (tokenSource) {
      this.tokenPrefix = tokenSource.slice(0, PERSON_API_TOKEN_PREFIX_LENGTH);
      this.tokenHash = `${PERSON_API_TOKEN_HASH_INDICATOR}${crypto
        .createHash('sha256')
        .update(tokenSource)
        .digest('hex')}`;
      this.rawToken = undefined;
      return;
    }

    if (
      this.tokenHash &&
      !this.tokenHash.startsWith(PERSON_API_TOKEN_HASH_INDICATOR)
    ) {
      this.tokenHash = `${PERSON_API_TOKEN_HASH_INDICATOR}${crypto
        .createHash('sha256')
        .update(this.tokenHash)
        .digest('hex')}`;
    }
  }

  private getPlaintextTokenHash(): string | null {
    if (
      this.tokenHash &&
      !this.tokenHash.startsWith(PERSON_API_TOKEN_HASH_INDICATOR)
    ) {
      return this.tokenHash;
    }

    return null;
  }
  //#endregion
}
