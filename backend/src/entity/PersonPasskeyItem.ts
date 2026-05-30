import { type Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { PersonItem } from './PersonItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

/**
 * Passkey/WebAuthn credential registered for a local Sapling user.
 */
@Entity()
export class PersonPasskeyItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'personPasskey.groupBasics',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ length: 128, nullable: false })
  label!: string;

  @ApiHideProperty()
  @Sapling(['isSecurity'])
  @SaplingForm({
    order: 100,
    group: 'personPasskey.groupSecurity',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ length: 512, nullable: false, unique: true, hidden: true })
  credentialId!: string;

  @ApiHideProperty()
  @Sapling(['isSecurity'])
  @SaplingForm({
    order: 200,
    group: 'personPasskey.groupSecurity',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ columnType: 'text', nullable: false, hidden: true })
  publicKey!: string;

  @ApiPropertyOptional({ default: 0 })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ default: 0, nullable: false })
  counter = 0;

  @ApiPropertyOptional({ type: [String] })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ type: 'json', nullable: true })
  transports?: string[];

  @ApiPropertyOptional()
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ length: 32, nullable: true })
  credentialDeviceType?: string;

  @ApiPropertyOptional({ default: false })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ default: false, nullable: false })
  credentialBackedUp = false;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: true, type: 'datetime' })
  lastUsedAt?: Date;

  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson'])
  @SaplingForm({
    order: 100,
    group: 'personPasskey.groupReference',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: Rel<PersonItem>;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
