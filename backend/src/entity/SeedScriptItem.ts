import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity()
export class SeedScriptItem {
  @PrimaryKey()
  id!: number;

  @Property()
  scriptName!: string;

  @Property()
  entityName!: string;

  @Property()
  executedAt!: Date;

  @Property()
  status!: string; // e.g. 'success', 'failed'
}
