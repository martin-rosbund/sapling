import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity()
export class EntityItem {
  @PrimaryKey()
  handle!: string;

  @Property({ default: 'square-rounded' })
  icon: string | null;

  // System
  @Property({ nullable: true })
  createdAt: Date | null = new Date();

  @Property({ nullable: true, onUpdate: () => new Date() })
  updatedAt?: Date | null;
}
