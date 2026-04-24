import { type Rel } from '@mikro-orm/core';
import { Entity, OneToOne, Property } from '@mikro-orm/decorators/legacy';
import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { TicketItem } from './TicketItem';

@Entity()
export class TicketSearchDocumentItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty({ type: () => TicketItem })
  @OneToOne(() => TicketItem, { nullable: false, unique: true })
  ticket!: Rel<TicketItem>;

  @ApiPropertyOptional()
  @Property({ length: 32, nullable: true })
  ticketNumber?: string | null;

  @ApiPropertyOptional()
  @Property({ length: 128, nullable: true })
  externalNumber?: string | null;

  @ApiPropertyOptional()
  @Property({ length: 128, nullable: true })
  title?: string | null;

  @ApiProperty()
  @Property({ nullable: false, columnType: 'text' })
  searchText!: string;

  @ApiPropertyOptional()
  @Property({ nullable: true, columnType: 'text' })
  problemText?: string | null;

  @ApiPropertyOptional()
  @Property({ nullable: true, columnType: 'text' })
  solutionText?: string | null;

  @ApiProperty()
  @Property({ length: 128, nullable: false })
  contentHash!: string;

  @ApiPropertyOptional()
  @Property({ length: 128, nullable: true })
  embeddingModel?: string | null;

  @ApiProperty()
  @Property({ nullable: false, default: 1 })
  embeddingVersion = 1;

  @ApiHideProperty()
  @Property({ type: 'json', nullable: true, hidden: true })
  embedding?: number[] | null;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Property({ nullable: true, type: 'datetime' })
  sourceUpdatedAt?: Date | null;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Property({ nullable: true, type: 'datetime' })
  lastIndexedAt?: Date | null;

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
