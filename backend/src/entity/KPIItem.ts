import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity()
export class KPIItem {
  @PrimaryKey({ autoincrement: true })
  handle!: number | null;

  @Property({ length: 128 })
  name!: string;

  @Property({ length: 256, nullable: true })
  description?: string;

  @Property({ length: 128 })
  targetEntity!: string; // z.B. "TicketItem", "CompanyItem"

  @Property({ length: 32 })
  aggregation!: string; // z.B. "COUNT", "SUM", "AVG", "MIN", "MAX"

  @Property({ length: 128 })
  field!: string; // z.B. "status", "priority", "product"

  @Property({ type: 'json', nullable: true })
  filter?: object; // Optional: JSON-Filter für WHERE-Bedingungen

  @Property({ type: 'json', nullable: true })
  groupBy?: string[]; // Optional: Gruppierungsfelder

  @Property({ nullable: true, type: 'datetime' })
  createdAt: Date | null = new Date();

  @Property({ nullable: true, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date | null;
}
