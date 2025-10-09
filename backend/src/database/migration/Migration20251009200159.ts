import { Migration } from '@mikro-orm/migrations';

export class Migration20251009200159 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table \`company_item\` (\`handle\` integer not null primary key autoincrement, \`name\` text not null, \`street\` text not null, \`zip\` text not null, \`city\` text not null, \`phone\` text not null, \`email\` text not null, \`website\` text not null, \`is_active\` integer not null default true, \`require_password_change\` integer not null default false, \`created_at\` datetime null, \`updated_at\` text null, unique (\`handle\`));`);
    this.addSql(`create unique index \`company_item_name_unique\` on \`company_item\` (\`name\`);`);

    this.addSql(`create table \`contract_item\` (\`handle\` integer not null primary key autoincrement, \`title\` text not null, \`description\` text null, \`start_date\` date not null, \`end_date\` date null, \`is_active\` integer not null default true, \`response_time_hours\` integer null, \`company_handle\` text not null, \`created_at\` datetime null, \`updated_at\` datetime null, constraint \`contract_item_company_handle_foreign\` foreign key(\`company_handle\`) references \`company_item\`(\`handle\`) on update cascade, unique (\`handle\`));`);
    this.addSql(`create index \`contract_item_company_handle_index\` on \`contract_item\` (\`company_handle\`);`);

    this.addSql(`create table \`entity_item\` (\`handle\` text not null, \`icon\` text not null default 'square-rounded', \`created_at\` datetime null, \`updated_at\` text null, primary key (\`handle\`));`);

    this.addSql(`create table \`language_item\` (\`handle\` text not null, \`name\` text not null, \`created_at\` datetime null, \`updated_at\` text null, primary key (\`handle\`));`);
    this.addSql(`create unique index \`language_item_name_unique\` on \`language_item\` (\`name\`);`);

    this.addSql(`create table \`permission_item\` (\`entity_handle\` text not null, \`allow_read\` integer not null default true, \`allow_insert\` integer not null default true, \`allow_update\` integer not null default true, \`allow_delete\` integer not null default true, \`allow_show\` integer not null default true, \`created_at\` datetime null, \`updated_at\` text null, constraint \`permission_item_entity_handle_foreign\` foreign key(\`entity_handle\`) references \`entity_item\`(\`handle\`) on delete cascade on update cascade, primary key (\`entity_handle\`));`);
    this.addSql(`create index \`permission_item_entity_handle_index\` on \`permission_item\` (\`entity_handle\`);`);

    this.addSql(`create table \`person_item\` (\`handle\` integer not null primary key autoincrement, \`first_name\` text not null, \`last_name\` text not null, \`login_name\` text not null, \`login_password\` text null, \`phone\` text null, \`mobile\` text null, \`email\` text null, \`birth_day\` datetime null, \`require_password_change\` integer not null default false, \`is_active\` integer not null default true, \`company_handle\` text null, \`language_handle\` text null, \`created_at\` datetime null, \`updated_at\` datetime null, constraint \`person_item_company_handle_foreign\` foreign key(\`company_handle\`) references \`company_item\`(\`handle\`) on delete set null on update cascade, constraint \`person_item_language_handle_foreign\` foreign key(\`language_handle\`) references \`language_item\`(\`handle\`) on delete set null on update cascade, unique (\`handle\`));`);
    this.addSql(`create unique index \`person_item_login_name_unique\` on \`person_item\` (\`login_name\`);`);
    this.addSql(`create index \`person_item_company_handle_index\` on \`person_item\` (\`company_handle\`);`);
    this.addSql(`create index \`person_item_language_handle_index\` on \`person_item\` (\`language_handle\`);`);

    this.addSql(`create table \`note_item\` (\`handle\` integer not null primary key autoincrement, \`title\` text not null, \`description\` text null, \`person_handle\` text null, \`created_at\` datetime null, \`updated_at\` text null, constraint \`note_item_person_handle_foreign\` foreign key(\`person_handle\`) references \`person_item\`(\`handle\`) on delete set null on update cascade, unique (\`handle\`));`);
    this.addSql(`create index \`note_item_person_handle_index\` on \`note_item\` (\`person_handle\`);`);

    this.addSql(`create table \`product_item\` (\`handle\` integer not null primary key autoincrement, \`title\` text not null, \`name\` text not null, \`version\` text null, \`description\` text null, \`created_at\` datetime null, \`updated_at\` datetime null, unique (\`handle\`));`);

    this.addSql(`create table \`contract_item_products\` (\`contract_item_handle\` text not null, \`product_item_handle\` text not null, constraint \`contract_item_products_contract_item_handle_foreign\` foreign key(\`contract_item_handle\`) references \`contract_item\`(\`handle\`) on delete cascade on update cascade, constraint \`contract_item_products_product_item_handle_foreign\` foreign key(\`product_item_handle\`) references \`product_item\`(\`handle\`) on delete cascade on update cascade, primary key (\`contract_item_handle\`, \`product_item_handle\`));`);
    this.addSql(`create index \`contract_item_products_contract_item_handle_index\` on \`contract_item_products\` (\`contract_item_handle\`);`);
    this.addSql(`create index \`contract_item_products_product_item_handle_index\` on \`contract_item_products\` (\`product_item_handle\`);`);

    this.addSql(`create table \`right_item\` (\`entity_handle\` text not null, \`can_read\` integer not null default true, \`can_insert\` integer not null default true, \`can_update\` integer not null default true, \`can_delete\` integer not null default true, \`can_show\` integer not null default true, \`created_at\` datetime null, \`updated_at\` text null, constraint \`right_item_entity_handle_foreign\` foreign key(\`entity_handle\`) references \`entity_item\`(\`handle\`) on delete cascade on update cascade, primary key (\`entity_handle\`));`);
    this.addSql(`create index \`right_item_entity_handle_index\` on \`right_item\` (\`entity_handle\`);`);

    this.addSql(`create table \`role_stage_item\` (\`handle\` text not null, \`description\` text not null, \`created_at\` datetime null, \`updated_at\` text null, primary key (\`handle\`));`);

    this.addSql(`create table \`role_item\` (\`handle\` integer not null primary key autoincrement, \`title\` text not null, \`stage_handle\` text not null, \`created_at\` datetime null, \`updated_at\` text null, constraint \`role_item_stage_handle_foreign\` foreign key(\`stage_handle\`) references \`role_stage_item\`(\`handle\`) on update cascade, unique (\`handle\`));`);
    this.addSql(`create index \`role_item_stage_handle_index\` on \`role_item\` (\`stage_handle\`);`);

    this.addSql(`create table \`role_item_permissions\` (\`role_item_handle\` text not null, \`permission_item_entity_handle\` text not null, constraint \`role_item_permissions_role_item_handle_foreign\` foreign key(\`role_item_handle\`) references \`role_item\`(\`handle\`) on delete cascade on update cascade, constraint \`role_item_permissions_permission_item_entity_handle_foreign\` foreign key(\`permission_item_entity_handle\`) references \`permission_item\`(\`entity_handle\`) on delete cascade on update cascade, primary key (\`role_item_handle\`, \`permission_item_entity_handle\`));`);
    this.addSql(`create index \`role_item_permissions_role_item_handle_index\` on \`role_item_permissions\` (\`role_item_handle\`);`);
    this.addSql(`create index \`role_item_permissions_permission_item_entity_handle_index\` on \`role_item_permissions\` (\`permission_item_entity_handle\`);`);

    this.addSql(`create table \`person_item_roles\` (\`person_item_handle\` text not null, \`role_item_handle\` text not null, constraint \`person_item_roles_person_item_handle_foreign\` foreign key(\`person_item_handle\`) references \`person_item\`(\`handle\`) on delete cascade on update cascade, constraint \`person_item_roles_role_item_handle_foreign\` foreign key(\`role_item_handle\`) references \`role_item\`(\`handle\`) on delete cascade on update cascade, primary key (\`person_item_handle\`, \`role_item_handle\`));`);
    this.addSql(`create index \`person_item_roles_person_item_handle_index\` on \`person_item_roles\` (\`person_item_handle\`);`);
    this.addSql(`create index \`person_item_roles_role_item_handle_index\` on \`person_item_roles\` (\`role_item_handle\`);`);

    this.addSql(`create table \`ticket_priority_item\` (\`handle\` text not null, \`description\` text not null, \`color\` text not null, \`created_at\` datetime null, \`updated_at\` text null, primary key (\`handle\`));`);

    this.addSql(`create table \`ticket_status_item\` (\`handle\` text not null, \`description\` text not null, \`created_at\` datetime null, \`updated_at\` text null, primary key (\`handle\`));`);

    this.addSql(`create table \`ticket_item\` (\`handle\` integer not null primary key autoincrement, \`title\` text not null, \`problem_description\` text null, \`solution_description\` text null, \`assignee_handle\` text null, \`creator_handle\` text null, \`status_handle\` text not null, \`priority_handle\` text null, \`created_at\` datetime null, \`updated_at\` text null, constraint \`ticket_item_assignee_handle_foreign\` foreign key(\`assignee_handle\`) references \`person_item\`(\`handle\`) on delete set null on update cascade, constraint \`ticket_item_creator_handle_foreign\` foreign key(\`creator_handle\`) references \`person_item\`(\`handle\`) on delete set null on update cascade, constraint \`ticket_item_status_handle_foreign\` foreign key(\`status_handle\`) references \`ticket_status_item\`(\`handle\`) on update cascade, constraint \`ticket_item_priority_handle_foreign\` foreign key(\`priority_handle\`) references \`ticket_priority_item\`(\`handle\`) on delete set null on update cascade, unique (\`handle\`));`);
    this.addSql(`create index \`ticket_item_assignee_handle_index\` on \`ticket_item\` (\`assignee_handle\`);`);
    this.addSql(`create index \`ticket_item_creator_handle_index\` on \`ticket_item\` (\`creator_handle\`);`);
    this.addSql(`create index \`ticket_item_status_handle_index\` on \`ticket_item\` (\`status_handle\`);`);
    this.addSql(`create index \`ticket_item_priority_handle_index\` on \`ticket_item\` (\`priority_handle\`);`);

    this.addSql(`create table \`translation_item\` (\`entity\` text not null, \`property\` text not null, \`language_handle\` text not null, \`value\` text not null, \`created_at\` datetime null, \`updated_at\` text null, constraint \`translation_item_language_handle_foreign\` foreign key(\`language_handle\`) references \`language_item\`(\`handle\`) on update cascade, primary key (\`entity\`, \`property\`, \`language_handle\`));`);
    this.addSql(`create index \`translation_item_language_handle_index\` on \`translation_item\` (\`language_handle\`);`);
  }

}
