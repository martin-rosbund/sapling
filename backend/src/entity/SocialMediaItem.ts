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
  @Sapling(['isShowInCompact'])
  @SaplingForm({ order: 100, group: 'socialMedia.groupBasics', width: 2 })
  @Property({ length: 128, nullable: true })
  title?: string;

  @ApiProperty()
  @Sapling(['isLink'])
  @SaplingForm({ order: 100, group: 'socialMedia.groupContact', width: 4 })
  @Property({ length: 256, nullable: false })
  url!: string;

  @ApiPropertyOptional()
  @Sapling(['isShowInCompact'])
  @SaplingForm({ order: 200, group: 'socialMedia.groupBasics', width: 2 })
  @Property({ length: 64, nullable: true })
  username?: string;

  @ApiPropertyOptional()
  @SaplingForm({ order: 100, group: 'socialMedia.groupIntegration', width: 2 })
  @Property({ length: 128, nullable: true, name: 'external_id' })
  externalId?: string;

  @ApiProperty()
  @SaplingForm({
    order: 100,
    group: 'socialMedia.groupConfiguration',
    width: 1,
  })
  @Property({ default: false, nullable: false, name: 'is_primary' })
  isPrimary?: boolean = false;

  @ApiProperty()
  @SaplingForm({
    order: 200,
    group: 'socialMedia.groupConfiguration',
    width: 1,
  })
  @Property({ default: true, nullable: false, name: 'is_public' })
  isPublic?: boolean = true;

  @ApiPropertyOptional()
  @SaplingForm({ order: 100, group: 'socialMedia.groupContent', width: 4 })
  @Property({ length: 256, nullable: true })
  notes?: string;

  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson', 'isPartner', 'isCurrentPerson'])
  @SaplingForm({ order: 100, group: 'socialMedia.groupReference', width: 2 })
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: Rel<PersonItem>;

  @ApiProperty({ type: () => SocialMediaTypeItem })
  @Sapling(['isChip'])
  @SaplingForm({ order: 200, group: 'socialMedia.groupReference', width: 1 })
  @ManyToOne(() => SocialMediaTypeItem, { nullable: false })
  type!: Rel<SocialMediaTypeItem>;

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
