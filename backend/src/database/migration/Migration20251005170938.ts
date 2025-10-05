import { Migration } from '@mikro-orm/migrations';

export class Migration20251005170938 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table \`company_item\` (\`handle\` integer not null primary key autoincrement, \`name\` text not null, \`street\` text not null, \`zip\` text not null, \`city\` text not null, \`phone\` text not null, \`email\` text not null, \`website\` text not null, \`is_active\` integer not null default true, \`require_password_change\` integer not null default false, unique (\`handle\`));`);
    this.addSql(`create unique index \`company_item_name_unique\` on \`company_item\` (\`name\`);`);

    this.addSql(`create table \`language_item\` (\`handle\` text not null, \`name\` text not null, primary key (\`handle\`));`);
    this.addSql(`create unique index \`language_item_name_unique\` on \`language_item\` (\`name\`);`);

    this.addSql(`create table \`person_item\` (\`handle\` integer not null primary key autoincrement, \`first_name\` text not null, \`last_name\` text not null, \`login_name\` text not null, \`login_password\` text not null, \`phone\` text not null, \`mobile\` text not null, \`email\` text not null, \`birth_day\` datetime not null, \`require_password_change\` integer not null, \`is_active\` integer not null, \`company_handle\` text not null, \`language_handle\` text not null, constraint \`person_item_company_handle_foreign\` foreign key(\`company_handle\`) references \`company_item\`(\`handle\`) on update cascade, constraint \`person_item_language_handle_foreign\` foreign key(\`language_handle\`) references \`language_item\`(\`handle\`) on update cascade, unique (\`handle\`));`);
    this.addSql(`create unique index \`person_item_login_name_unique\` on \`person_item\` (\`login_name\`);`);
    this.addSql(`create index \`person_item_company_handle_index\` on \`person_item\` (\`company_handle\`);`);
    this.addSql(`create index \`person_item_language_handle_index\` on \`person_item\` (\`language_handle\`);`);

    this.addSql(`create table \`translation_item\` (\`entity\` text not null, \`property\` text not null, \`language_handle\` text not null, \`value\` text not null, constraint \`translation_item_language_handle_foreign\` foreign key(\`language_handle\`) references \`language_item\`(\`handle\`) on update cascade, primary key (\`entity\`, \`property\`, \`language_handle\`));`);
    this.addSql(`create index \`translation_item_language_handle_index\` on \`translation_item\` (\`language_handle\`);`);
  }

}
