import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { EntityItem } from './EntityItem';

@Entity()
export class RightItem {
  @Property({ default: true })
  canRead: boolean | null;

  @Property({ default: true })
  canInsert: boolean | null;

  @Property({ default: true })
  canUpdate: boolean | null;

  @Property({ default: true })
  canDelete: boolean | null;

  @Property({ default: true })
  canShow: boolean | null;

  // Relations
  @ManyToOne(() => EntityItem, { primary: true })
  entity!: EntityItem;

  // System
  @Property({ nullable: true, type: 'datetime' })
  createdAt: Date | null = new Date();

  @Property({ nullable: true, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date | null;
}
