import { ApiProperty } from '@nestjs/swagger';

export class EntityTemplateDto {
  @ApiProperty({ description: 'The name of the property (column) in the entity.' })
  name: string;

  @ApiProperty({ description: 'The data type of the property (e.g., string, number, boolean, date, etc.).' })
  type: string;

  @ApiProperty({ description: 'The length of the property (if applicable, e.g., for string columns). Null if not applicable.', nullable: true, type: Number })
  length?: number | null;

  @ApiProperty({ description: 'The default value for the property, if any. Can be any type or null if not set.', nullable: true })
  default?: any;

  @ApiProperty({ description: 'True if the property is a primary key column.' })
  isPrimaryKey: boolean;

  @ApiProperty({ description: 'True if the property is auto-incremented.' })
  isAutoIncrement: boolean;

  @ApiProperty({ description: 'Join columns for relations, if any.', nullable: true, type: [Object] })
  joinColumns?: object[] | null;

  @ApiProperty({ description: 'The kind of relation (e.g., 1:1, 1:m, m:n), or null if not a relation.', nullable: true })
  kind?: string | null;

  @ApiProperty({ description: 'The property name on the related entity that maps this relation.', nullable: true })
  mappedBy?: string | null;

  @ApiProperty({ description: 'The property name on the related entity that inverses this relation.', nullable: true })
  inversedBy?: string | null;

  @ApiProperty({ description: 'The name of the referenced entity, if this property is a relation.' })
  referenceName: string;

  @ApiProperty({ description: 'True if the property is a reference to another entity.' })
  isReference: boolean;

  @ApiProperty({ description: 'True if the property is a system field (e.g., createdAt, updatedAt).' })
  isSystem: boolean;

  @ApiProperty({ description: 'True if the property is required (not nullable or primary key).' })
  isRequired: boolean;

  @ApiProperty({ description: 'Indicates if the property can be null.' })
  nullable: boolean;

  @ApiProperty({ description: 'True if the property is persisted in the database.' })
  isPersistent: boolean;
}
