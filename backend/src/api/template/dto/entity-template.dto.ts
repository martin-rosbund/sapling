import { ApiProperty } from '@nestjs/swagger';
import {
  SaplingOption,
  type SaplingFormWidthSpan,
  type SaplingReferenceDependency,
} from '../../../entity/global/entity.decorator';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         DTO describing entity property metadata for templates.
 *
 * @property        name                The name of the property (column) in the entity
 * @property        type                The data type of the property
 * @property        length              The length of the property (if applicable)
 * @property        default             The default value for the property
 * @property        isPrimaryKey        True if the property is a primary key column
 * @property        isAutoIncrement     True if the property is auto-incremented
 * @property        kind                The kind of relation (e.g., 1:1, 1:m, m:n)
 * @property        mappedBy            The property name on the related entity that maps this relation
 * @property        inversedBy          The property name on the related entity that inverses this relation
 * @property        isUnique            Indicates if the property has a unique constraint
 * @property        referenceName       The name of the referenced entity, if this property is a relation
 * @property        isReference         True if the property is a reference to another entity
 * @property        isRequired          True if the property is required (not nullable or primary key)
 * @property        nullable            Indicates if the property can be null
 * @property        isPersistent        True if the property is persisted in the database
 * @property        referencedPks       Referenced primary keys for the property, if any
 * @property        options             Additional options defined via Sapling decorators
 * @property        formGroup           Optional form group key for generated edit dialogs
 * @property        formOrder           Optional form order index for generated edit dialogs
 * @property        formWidth           Optional form width span (1-4) for generated edit dialogs
 * @property        referenceDependency Declarative parent-child dependency metadata for reference fields
 */
export class EntityTemplateDto {
  @ApiProperty({
    description: 'The name of the property (column) in the entity.',
  })
  name!: string;

  @ApiProperty({
    description:
      'The data type of the property (e.g., string, number, boolean, date, etc.).',
  })
  type!: string;

  @ApiProperty({
    description:
      'The length of the property (if applicable, e.g., for string columns). Null if not applicable.',
    nullable: true,
    type: Number,
  })
  length?: number | null;

  @ApiProperty({
    description:
      'The default value for the property, if any. Can be any type or null if not set.',
    nullable: true,
  })
  default?: any;

  @ApiProperty({ description: 'True if the property is a primary key column.' })
  isPrimaryKey: boolean = false;

  @ApiProperty({ description: 'True if the property is auto-incremented.' })
  isAutoIncrement: boolean = false;

  @ApiProperty({
    description:
      'The kind of relation (e.g., 1:1, 1:m, m:n), or null if not a relation.',
    nullable: true,
  })
  kind?: string | null;

  @ApiProperty({
    description:
      'The property name on the related entity that maps this relation.',
    nullable: true,
  })
  mappedBy?: string | null;

  @ApiProperty({
    description:
      'The property name on the related entity that inverses this relation.',
    nullable: true,
  })
  inversedBy?: string | null;

  @ApiProperty({
    description: 'Indicates if the property has a unique constraint.',
  })
  isUnique: boolean = false;

  @ApiProperty({
    description:
      'The name of the referenced entity, if this property is a relation.',
  })
  referenceName: string = '';

  @ApiProperty({
    description: 'True if the property is a reference to another entity.',
  })
  isReference: boolean = false;

  @ApiProperty({
    description:
      'True if the property must be supplied by callers, excluding generated primary keys, read-only fields, and collection relations.',
  })
  isRequired: boolean = false;

  @ApiProperty({ description: 'Indicates if the property can be null.' })
  nullable: boolean = false;

  @ApiProperty({
    description: 'True if the property is persisted in the database.',
  })
  isPersistent: boolean = false;

  @ApiProperty({
    description: 'Referenced primary keys for the property, if any.',
    type: [String],
  })
  referencedPks: string[] = [];
  @ApiProperty({
    description:
      'Additional options defined via Sapling decorators on the property.',
    type: [String],
  })
  options: SaplingOption[] = [];

  @ApiProperty({
    description:
      'Optional form group translation key suffix for generated edit dialogs.',
    nullable: true,
    required: false,
  })
  formGroup: string | null = null;

  @ApiProperty({
    description:
      'Optional display order for generated edit dialogs. Lower values are rendered first.',
    nullable: true,
    required: false,
    type: Number,
  })
  formOrder: number | null = null;

  @ApiProperty({
    description:
      'Optional width span for generated edit dialogs on large screens, from 1 to 4.',
    nullable: true,
    required: false,
    enum: [1, 2, 3, 4],
  })
  formWidth: SaplingFormWidthSpan | null = null;

  @ApiProperty({
    description:
      'Declarative parent-child dependency metadata for reference fields.',
    nullable: true,
    required: false,
    type: Object,
  })
  referenceDependency?: SaplingReferenceDependency | null;
}
