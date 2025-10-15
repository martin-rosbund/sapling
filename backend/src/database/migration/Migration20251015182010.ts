import { Migration } from '@mikro-orm/migrations';

export class Migration20251015182010 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table \`company_item\` (\`handle\` integer not null primary key autoincrement, \`name\` text not null, \`street\` text not null, \`zip\` text null, \`city\` text null, \`phone\` text null, \`email\` text null, \`website\` text null, \`is_active\` integer not null default true, \`created_at\` datetime not null, \`updated_at\` datetime not null, unique (\`handle\`));`);
    this.addSql(`create unique index \`company_item_name_unique\` on \`company_item\` (\`name\`);`);

    this.addSql(`create table \`contract_item\` (\`handle\` integer not null primary key autoincrement, \`title\` text not null, \`description\` text null, \`start_date\` datetime not null, \`end_date\` datetime null, \`is_active\` integer not null default true, \`response_time_hours\` integer not null default 24, \`company_handle\` text not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, constraint \`contract_item_company_handle_foreign\` foreign key(\`company_handle\`) references \`company_item\`(\`handle\`) on update cascade, unique (\`handle\`));`);
    this.addSql(`create index \`contract_item_company_handle_index\` on \`contract_item\` (\`company_handle\`);`);

    this.addSql(`create table \`entity_group_item\` (\`handle\` text not null, \`icon\` text not null default 'folder', \`created_at\` datetime not null, \`updated_at\` datetime not null, primary key (\`handle\`));`);

    this.addSql(`create table \`entity_item\` (\`handle\` text not null, \`icon\` text not null default 'square-rounded', \`route\` text null, \`is_menu\` integer not null default false, \`can_insert\` integer not null default false, \`can_update\` integer not null default false, \`can_delete\` integer not null default false, \`group_handle\` text null, \`created_at\` datetime not null, \`updated_at\` datetime not null, constraint \`entity_item_group_handle_foreign\` foreign key(\`group_handle\`) references \`entity_group_item\`(\`handle\`) on delete set null on update cascade, primary key (\`handle\`));`);
    this.addSql(`create index \`entity_item_group_handle_index\` on \`entity_item\` (\`group_handle\`);`);

    this.addSql(`create table \`kpiitem\` (\`handle\` integer not null primary key autoincrement, \`name\` text not null, \`description\` text null, \`aggregation\` text not null default 'COUNT', \`field\` text not null, \`filter\` json null, \`group_by\` json null, \`target_entity_handle\` text null, \`created_at\` datetime not null, \`updated_at\` datetime not null, constraint \`kpiitem_target_entity_handle_foreign\` foreign key(\`target_entity_handle\`) references \`entity_item\`(\`handle\`) on delete set null on update cascade, unique (\`handle\`));`);
    this.addSql(`create index \`kpiitem_target_entity_handle_index\` on \`kpiitem\` (\`target_entity_handle\`);`);

    this.addSql(`create table \`language_item\` (\`handle\` text not null, \`name\` text not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, primary key (\`handle\`));`);
    this.addSql(`create unique index \`language_item_name_unique\` on \`language_item\` (\`name\`);`);

    this.addSql(`create table \`permission_item\` (\`entity_handle\` text not null, \`allow_read\` integer not null default true, \`allow_insert\` integer not null default true, \`allow_update\` integer not null default true, \`allow_delete\` integer not null default true, \`allow_show\` integer not null default true, \`created_at\` datetime not null, \`updated_at\` datetime not null, constraint \`permission_item_entity_handle_foreign\` foreign key(\`entity_handle\`) references \`entity_item\`(\`handle\`) on delete cascade on update cascade, primary key (\`entity_handle\`));`);
    this.addSql(`create index \`permission_item_entity_handle_index\` on \`permission_item\` (\`entity_handle\`);`);

    this.addSql(`create table \`person_item\` (\`handle\` integer not null primary key autoincrement, \`first_name\` text not null, \`last_name\` text not null, \`login_name\` text null, \`login_password\` text null, \`phone\` text null, \`mobile\` text null, \`email\` text null, \`birth_day\` datetime null, \`require_password_change\` integer not null default false, \`is_active\` integer not null default true, \`company_handle\` text null, \`language_handle\` text null, \`created_at\` datetime not null, \`updated_at\` datetime not null, constraint \`person_item_company_handle_foreign\` foreign key(\`company_handle\`) references \`company_item\`(\`handle\`) on delete set null on update cascade, constraint \`person_item_language_handle_foreign\` foreign key(\`language_handle\`) references \`language_item\`(\`handle\`) on delete set null on update cascade, unique (\`handle\`));`);
    this.addSql(`create unique index \`person_item_login_name_unique\` on \`person_item\` (\`login_name\`);`);
    this.addSql(`create index \`person_item_company_handle_index\` on \`person_item\` (\`company_handle\`);`);
    this.addSql(`create index \`person_item_language_handle_index\` on \`person_item\` (\`language_handle\`);`);

    this.addSql(`create table \`note_item\` (\`handle\` integer not null primary key autoincrement, \`title\` text not null, \`description\` text null, \`person_handle\` text null, \`created_at\` datetime not null, \`updated_at\` datetime not null, constraint \`note_item_person_handle_foreign\` foreign key(\`person_handle\`) references \`person_item\`(\`handle\`) on delete set null on update cascade, unique (\`handle\`));`);
    this.addSql(`create index \`note_item_person_handle_index\` on \`note_item\` (\`person_handle\`);`);

    this.addSql(`create table \`product_item\` (\`handle\` integer not null primary key autoincrement, \`title\` text not null, \`name\` text not null, \`version\` text null default '1.0.0', \`description\` text null, \`created_at\` datetime not null, \`updated_at\` datetime not null, unique (\`handle\`));`);

    this.addSql(`create table \`contract_item_products\` (\`contract_item_handle\` text not null, \`product_item_handle\` text not null, constraint \`contract_item_products_contract_item_handle_foreign\` foreign key(\`contract_item_handle\`) references \`contract_item\`(\`handle\`) on delete cascade on update cascade, constraint \`contract_item_products_product_item_handle_foreign\` foreign key(\`product_item_handle\`) references \`product_item\`(\`handle\`) on delete cascade on update cascade, primary key (\`contract_item_handle\`, \`product_item_handle\`));`);
    this.addSql(`create index \`contract_item_products_contract_item_handle_index\` on \`contract_item_products\` (\`contract_item_handle\`);`);
    this.addSql(`create index \`contract_item_products_product_item_handle_index\` on \`contract_item_products\` (\`product_item_handle\`);`);

    this.addSql(`create table \`role_stage_item\` (\`handle\` text not null, \`description\` text not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, primary key (\`handle\`));`);

    this.addSql(`create table \`role_item\` (\`handle\` integer not null primary key autoincrement, \`title\` text not null, \`stage_handle\` text not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, constraint \`role_item_stage_handle_foreign\` foreign key(\`stage_handle\`) references \`role_stage_item\`(\`handle\`) on update cascade, unique (\`handle\`));`);
    this.addSql(`create index \`role_item_stage_handle_index\` on \`role_item\` (\`stage_handle\`);`);

    this.addSql(`create table \`role_item_permissions\` (\`role_item_handle\` text not null, \`permission_item_entity_handle\` text not null, constraint \`role_item_permissions_role_item_handle_foreign\` foreign key(\`role_item_handle\`) references \`role_item\`(\`handle\`) on delete cascade on update cascade, constraint \`role_item_permissions_permission_item_entity_handle_foreign\` foreign key(\`permission_item_entity_handle\`) references \`permission_item\`(\`entity_handle\`) on delete cascade on update cascade, primary key (\`role_item_handle\`, \`permission_item_entity_handle\`));`);
    this.addSql(`create index \`role_item_permissions_role_item_handle_index\` on \`role_item_permissions\` (\`role_item_handle\`);`);
    this.addSql(`create index \`role_item_permissions_permission_item_entity_handle_index\` on \`role_item_permissions\` (\`permission_item_entity_handle\`);`);

    this.addSql(`create table \`person_item_roles\` (\`person_item_handle\` text not null, \`role_item_handle\` text not null, constraint \`person_item_roles_person_item_handle_foreign\` foreign key(\`person_item_handle\`) references \`person_item\`(\`handle\`) on delete cascade on update cascade, constraint \`person_item_roles_role_item_handle_foreign\` foreign key(\`role_item_handle\`) references \`role_item\`(\`handle\`) on delete cascade on update cascade, primary key (\`person_item_handle\`, \`role_item_handle\`));`);
    this.addSql(`create index \`person_item_roles_person_item_handle_index\` on \`person_item_roles\` (\`person_item_handle\`);`);
    this.addSql(`create index \`person_item_roles_role_item_handle_index\` on \`person_item_roles\` (\`role_item_handle\`);`);

    this.addSql(`create table \`ticket_priority_item\` (\`handle\` text not null, \`description\` text not null, \`color\` text not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, primary key (\`handle\`));`);

    this.addSql(`create table \`ticket_status_item\` (\`handle\` text not null, \`description\` text not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, primary key (\`handle\`));`);

    this.addSql(`create table \`ticket_item\` (\`handle\` integer not null primary key autoincrement, \`title\` text not null, \`problem_description\` text null, \`solution_description\` text null, \`assignee_handle\` text null, \`creator_handle\` text null, \`status_handle\` text not null, \`priority_handle\` text null, \`created_at\` datetime not null, \`updated_at\` datetime not null, constraint \`ticket_item_assignee_handle_foreign\` foreign key(\`assignee_handle\`) references \`person_item\`(\`handle\`) on delete set null on update cascade, constraint \`ticket_item_creator_handle_foreign\` foreign key(\`creator_handle\`) references \`person_item\`(\`handle\`) on delete set null on update cascade, constraint \`ticket_item_status_handle_foreign\` foreign key(\`status_handle\`) references \`ticket_status_item\`(\`handle\`) on update cascade, constraint \`ticket_item_priority_handle_foreign\` foreign key(\`priority_handle\`) references \`ticket_priority_item\`(\`handle\`) on delete set null on update cascade, unique (\`handle\`));`);
    this.addSql(`create index \`ticket_item_assignee_handle_index\` on \`ticket_item\` (\`assignee_handle\`);`);
    this.addSql(`create index \`ticket_item_creator_handle_index\` on \`ticket_item\` (\`creator_handle\`);`);
    this.addSql(`create index \`ticket_item_status_handle_index\` on \`ticket_item\` (\`status_handle\`);`);
    this.addSql(`create index \`ticket_item_priority_handle_index\` on \`ticket_item\` (\`priority_handle\`);`);

    this.addSql(`create table \`translation_item\` (\`entity\` text not null, \`property\` text not null, \`language_handle\` text not null, \`value\` text not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, constraint \`translation_item_language_handle_foreign\` foreign key(\`language_handle\`) references \`language_item\`(\`handle\`) on update cascade, primary key (\`entity\`, \`property\`, \`language_handle\`));`);
    this.addSql(`create index \`translation_item_language_handle_index\` on \`translation_item\` (\`language_handle\`);`);
  }

}
