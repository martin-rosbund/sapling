import { type Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PersonItem } from './PersonItem';
import { SocialMediaTypeItem } from './SocialMediaTypeItem';
import { Sapling, SaplingForm } from './global/entity.decorator';

@Entity()
export class SocialMediaItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle!: number;

  @ApiPropertyOptional()
  @Sapling(['isValue'])
  @SaplingForm({
    order: 100,
    group: 'socialMedia.groupBasics',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ length: 128, nullable: true })
  title?: string;

  @ApiProperty()
  @Sapling(['isLink'])
  @SaplingForm({
    order: 100,
    group: 'socialMedia.groupContact',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ length: 256, nullable: false })
  url!: string;

  @ApiPropertyOptional()
  @Sapling(['isValue'])
  @SaplingForm({
    order: 200,
    group: 'socialMedia.groupBasics',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: true,
  })
  @Property({ length: 64, nullable: true })
  username?: string;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 100,
    group: 'socialMedia.groupIntegration',
    groupOrder: 300,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ length: 128, nullable: true, name: 'external_id' })
  externalId?: string;

  @ApiPropertyOptional({ default: false })
  @SaplingForm({
    order: 100,
    group: 'socialMedia.groupConfiguration',
    groupOrder: 400,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ default: false, nullable: false, name: 'is_primary' })
  isPrimary?: boolean = false;

  @ApiPropertyOptional({ default: true })
  @SaplingForm({
    order: 200,
    group: 'socialMedia.groupConfiguration',
    groupOrder: 400,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ default: true, nullable: false, name: 'is_public' })
  isPublic?: boolean = true;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 100,
    group: 'socialMedia.groupContent',
    groupOrder: 500,
    width: 4,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ length: 256, nullable: true })
  notes?: string;

  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson', 'isPartner', 'isCurrentPerson'])
  @SaplingForm({
    order: 100,
    group: 'socialMedia.groupReference',
    groupOrder: 600,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: Rel<PersonItem>;

  @ApiProperty({ type: () => SocialMediaTypeItem })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 200,
    group: 'socialMedia.groupReference',
    groupOrder: 600,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @ManyToOne(() => SocialMediaTypeItem, { nullable: false })
  type!: Rel<SocialMediaTypeItem>;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
