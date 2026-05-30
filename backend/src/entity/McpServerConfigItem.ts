import { Entity, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';

@Entity()
export class McpServerConfigItem {
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'mcpServerConfig.groupBasics',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ length: 128, nullable: false })
  name!: string;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 100,
    group: 'mcpServerConfig.groupContent',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ length: 512, nullable: true })
  description?: string | null;

  @ApiPropertyOptional({ default: 'http' })
  @Sapling(['isChip'])
  @SaplingForm({
    order: 100,
    group: 'mcpServerConfig.groupIntegration',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ length: 32, nullable: false, default: 'http' })
  transport = 'http';

  @ApiPropertyOptional({ default: true })
  @SaplingForm({
    order: 100,
    group: 'mcpServerConfig.groupConfiguration',
    groupOrder: 400,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ default: true, nullable: false })
  isActive = true;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 100,
    group: 'mcpServerConfig.groupSchedule',
    groupOrder: 500,
    width: 4,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ length: 512, nullable: true })
  endpoint?: string | null;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 200,
    group: 'mcpServerConfig.groupBasics',
    groupOrder: 100,
    width: 4,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ length: 512, nullable: true })
  command?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @SaplingForm({
    order: 300,
    group: 'mcpServerConfig.groupBasics',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  args?: string[] | null;

  @ApiPropertyOptional()
  @Sapling(['isSecurity'])
  @SaplingForm({
    order: 100,
    group: 'mcpServerConfig.groupSecurity',
    groupOrder: 600,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true, hidden: true })
  environment?: Record<string, string> | null;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 200,
    group: 'mcpServerConfig.groupContent',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  headers?: Record<string, string> | null;

  @ApiPropertyOptional()
  @Sapling(['isSecurity'])
  @SaplingForm({
    order: 200,
    group: 'mcpServerConfig.groupSecurity',
    groupOrder: 600,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true, hidden: true })
  authConfig?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: [String] })
  @SaplingForm({
    order: 200,
    group: 'mcpServerConfig.groupConfiguration',
    groupOrder: 400,
    width: 2,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ type: 'json', nullable: true })
  allowedTools?: string[] | null;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 400,
    group: 'mcpServerConfig.groupBasics',
    groupOrder: 100,
    width: 1,
    visible: true,
    tableOrder: 400,
    tableVisible: true,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @Property({ nullable: true })
  timeoutMs?: number | null;

  @ApiPropertyOptional({ default: 0 })
  @SaplingForm({
    order: 300,
    group: 'mcpServerConfig.groupConfiguration',
    groupOrder: 400,
    width: 2,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ nullable: false, default: 0 })
  sortOrder = 0;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
