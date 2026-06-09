import { Entity, Property } from '@mikro-orm/decorators/legacy';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';

@Entity()
export class CompanyChurnRiskReasonItem {
  @ApiProperty()
  @Sapling(['isOrderASC'])
  @Property({ primary: true, length: 64 })
  handle!: string;

  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'companyChurnRiskReason.groupBasics',
    groupOrder: 100,
    width: 2,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: true,
  })
  @Property({ length: 128, nullable: false })
  title!: string;

  @ApiPropertyOptional()
  @SaplingForm({
    order: 100,
    group: 'companyChurnRiskReason.groupContent',
    groupOrder: 200,
    width: 4,
    visible: true,
    tableOrder: 100,
    tableVisible: true,
    mobileOrder: 100,
    mobileVisible: false,
  })
  @Property({ length: 512, nullable: true })
  description?: string;

  @ApiPropertyOptional({ default: 'mdi-alert-outline' })
  @Sapling(['isIcon'])
  @SaplingForm({
    order: 200,
    group: 'companyChurnRiskReason.groupAppearance',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 200,
    tableVisible: true,
    mobileOrder: 200,
    mobileVisible: false,
  })
  @Property({ default: 'mdi-alert-outline', length: 64, nullable: false })
  icon?: string = 'mdi-alert-outline';

  @ApiPropertyOptional({ default: '#EF6C00' })
  @Sapling(['isColor'])
  @SaplingForm({
    order: 300,
    group: 'companyChurnRiskReason.groupAppearance',
    groupOrder: 300,
    width: 1,
    visible: true,
    tableOrder: 300,
    tableVisible: true,
    mobileOrder: 300,
    mobileVisible: false,
  })
  @Property({ default: '#EF6C00', length: 32, nullable: false })
  color!: string;

  @ApiPropertyOptional({ default: 0 })
  @Sapling(['isOrderASC'])
  @SaplingForm({
    order: 400,
    group: 'companyChurnRiskReason.groupConfiguration',
    groupOrder: 400,
    width: 1,
    visible: true,
    tableOrder: 400,
    tableVisible: true,
    mobileOrder: 400,
    mobileVisible: false,
  })
  @Property({ default: 0, nullable: false })
  sortOrder?: number = 0;

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @ApiPropertyOptional({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
