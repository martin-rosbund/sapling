import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity()
export class EntityItem {
  @PrimaryKey({ length: 64 })
  handle!: string;

  @Property({ default: 'square-rounded', length: 64 })
  icon: string | null;

  // System
  @Property({ nullable: true, type: 'datetime' })
  createdAt: Date | null = new Date();

  @Property({ nullable: true, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date | null;
}
