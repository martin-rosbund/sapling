import { Collection } from '@mikro-orm/core';
import { Entity, OneToMany, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { SocialMediaItem } from './SocialMediaItem';

@Entity()
export class SocialMediaTypeItem {
  @ApiProperty()
  @Sapling(['isOrderASC'])
  @Property({ primary: true, length: 64 })
  handle!: string;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'socialMediaType.groupBasics',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ length: 128, nullable: false })
  title!: string;

  @ApiPropertyOptional({ default: 'mdi-web' })
  @Sapling(['isIcon'])
  @SaplingForm({
    order: 100,
    group: 'socialMediaType.groupAppearance',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ default: 'mdi-web', length: 64, nullable: false })
  icon?: string = 'mdi-web';

  @ApiPropertyOptional({ default: '#1E88E5' })
  @Sapling(['isColor'])
  @SaplingForm({
    order: 200,
    group: 'socialMediaType.groupAppearance',
    groupOrder: 200,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ default: '#1E88E5', length: 32, nullable: false })
  color!: string;

  @ApiPropertyOptional({ type: () => SocialMediaItem, isArray: true })
  @OneToMany(
    () => SocialMediaItem,
    (socialMediaProfile) => socialMediaProfile.type,
  )
  socialMediaProfiles: Collection<SocialMediaItem> =
    new Collection<SocialMediaItem>(this);

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
