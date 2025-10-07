import { Entity, PrimaryKey } from '@mikro-orm/core';

@Entity()
export class RouteItem {
  @PrimaryKey()
  handle!: string;
}
