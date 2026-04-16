import { type Rel } from '@mikro-orm/core';
import {
  Entity,
  ManyToOne,
  Property,
} from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PersonItem } from './PersonItem';
import { SocialMediaTypeItem } from './SocialMediaTypeItem';
import { Sapling } from './global/entity.decorator';

@Entity()
export class SocialMediaItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle!: number;

  @ApiPropertyOptional()
  @Sapling(['isShowInCompact'])
  @Property({ length: 128, nullable: true })
  title?: string;

  @ApiProperty()
  @Sapling(['isLink'])
  @Property({ length: 256, nullable: false })
  url!: string;

  @ApiPropertyOptional()
  @Sapling(['isShowInCompact'])
  @Property({ length: 64, nullable: true })
  username?: string;

  @ApiPropertyOptional()
  @Property({ length: 128, nullable: true, name: 'external_id' })
  externalId?: string;

  @ApiProperty()
  @Property({ default: false, nullable: false, name: 'is_primary' })
  isPrimary?: boolean = false;

  @ApiProperty()
  @Property({ default: true, nullable: false, name: 'is_public' })
  isPublic?: boolean = true;

  @ApiPropertyOptional()
  @Property({ length: 256, nullable: true })
  notes?: string;

  @ApiProperty({ type: () => PersonItem })
  @Sapling(['isPerson', 'isPartner', 'isCurrentPerson'])
  @ManyToOne(() => PersonItem, { nullable: false })
  person!: Rel<PersonItem>;

  @ApiProperty({ type: () => SocialMediaTypeItem })
  @Sapling(['isChip'])
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