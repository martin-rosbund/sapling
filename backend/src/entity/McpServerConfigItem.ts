import { Entity, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling } from './global/entity.decorator';

@Entity()
export class McpServerConfigItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty()
  @Sapling(['isShowInCompact', 'isOrderASC'])
  @Property({ length: 128, nullable: false })
  name!: string;

  @ApiPropertyOptional()
  @Property({ length: 512, nullable: true })
  description?: string | null;

  @ApiProperty()
  @Sapling(['isChip'])
  @Property({ length: 32, nullable: false, default: 'http' })
  transport = 'http';

  @ApiProperty()
  @Property({ default: true, nullable: false })
  isActive = true;

  @ApiPropertyOptional()
  @Property({ length: 512, nullable: true })
  endpoint?: string | null;

  @ApiPropertyOptional()
  @Property({ length: 512, nullable: true })
  command?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @Property({ type: 'json', nullable: true })
  args?: string[] | null;

  @ApiPropertyOptional()
  @Sapling(['isSecurity'])
  @Property({ type: 'json', nullable: true })
  environment?: Record<string, string> | null;

  @ApiPropertyOptional()
  @Property({ type: 'json', nullable: true })
  headers?: Record<string, string> | null;

  @ApiPropertyOptional()
  @Sapling(['isSecurity'])
  @Property({ type: 'json', nullable: true })
  authConfig?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: [String] })
  @Property({ type: 'json', nullable: true })
  allowedTools?: string[] | null;

  @ApiPropertyOptional()
  @Property({ nullable: true })
  timeoutMs?: number | null;

  @ApiPropertyOptional()
  @Property({ nullable: false, default: 0 })
  sortOrder = 0;

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
