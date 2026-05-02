import { Collection } from '@mikro-orm/core';
import {
  Entity,
  ManyToMany,
  ManyToOne,
  Property,
} from '@mikro-orm/decorators/legacy';
import { type Rel } from '@mikro-orm/core';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sapling, SaplingForm } from './global/entity.decorator';
import { EmailTemplateItem } from './EmailTemplateItem';
import { CompanyItem } from './CompanyItem';
import { PersonItem } from './PersonItem';

/**
 * @class MailListItem
 * @version 1.0
 * @author Martin Rosbund
 * @summary Entity representing a mail list (Sammelliste) that can be used for bulk email delivery.
 *
 * @property {number} handle - Unique identifier for the mail list (primary key).
 * @property {string} title - Title/name of the mail list.
 * @property {EmailTemplateItem} [mailTemplate] - The email template assigned to this list (optional, n:1).
 * @property {Collection<CompanyItem>} companies - Companies assigned to this mail list (n:m).
 * @property {Collection<PersonItem>} persons - Persons assigned to this mail list (n:m).
 * @property {Date} createdAt - Date and time when the mail list was created.
 * @property {Date} updatedAt - Date and time when the mail list was last updated.
 */
@Entity()
export class EMailListItem {
  // #region Properties: Persisted
  /**
   * Unique identifier for the mail list (primary key).
   */
  @ApiProperty()
  @Property({ primary: true, autoincrement: true })
  handle?: number;

  /**
   * Title/name of the mail list.
   */
  @ApiProperty()
  @Sapling(['isValue', 'isOrderASC'])
  @SaplingForm({
    order: 100,
    group: 'mailList.groupBasics',
    groupOrder: 100,
    width: 4,
  })
  @Property({ length: 128, nullable: false })
  title!: string;
  // #endregion

  // #region Properties: Relation
  /**
   * The email template assigned to this mail list (optional, many-to-one).
   */
  @ApiPropertyOptional({ type: () => EmailTemplateItem })
  @SaplingForm({
    order: 100,
    group: 'mailList.groupReference',
    groupOrder: 200,
    width: 2,
  })
  @ManyToOne(() => EmailTemplateItem, { nullable: true })
  mailTemplate?: Rel<EmailTemplateItem>;

  /**
   * Companies assigned to this mail list (many-to-many).
   */
  @ApiPropertyOptional({ type: () => CompanyItem, isArray: true })
  @ManyToMany(() => CompanyItem)
  companies: Collection<CompanyItem> = new Collection<CompanyItem>(this);

  /**
   * Persons assigned to this mail list (many-to-many).
   */
  @ApiPropertyOptional({ type: () => PersonItem, isArray: true })
  @ManyToMany(() => PersonItem)
  persons: Collection<PersonItem> = new Collection<PersonItem>(this);
  // #endregion

  // #region Properties: System
  /**
   * Date and time when the mail list was created.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  /**
   * Date and time when the mail list was last updated.
   */
  @ApiProperty({ type: 'string', format: 'date-time' })
  @Sapling(['isReadOnly', 'isSystem'])
  @Property({ nullable: false, type: 'datetime', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
  // #endregion
}
