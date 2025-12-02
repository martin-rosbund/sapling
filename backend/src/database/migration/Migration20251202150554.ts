import { Migration } from '@mikro-orm/migrations';

export class Migration20251202150554 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table \`entity_group_item\` (\`handle\` text not null, \`icon\` text not null default 'mdi-folder', \`is_expanded\` integer not null default true, \`created_at\` datetime not null, \`updated_at\` datetime not null, primary key (\`handle\`));`);

    this.addSql(`create table \`entity_item\` (\`handle\` text not null, \`icon\` text not null default 'square-rounded', \`route\` text null, \`can_read\` integer not null default true, \`can_insert\` integer not null default false, \`can_update\` integer not null default false, \`can_delete\` integer not null default false, \`can_show\` integer not null default false, \`group_handle\` text null, \`created_at\` datetime not null, \`updated_at\` datetime not null, constraint \`entity_item_group_handle_foreign\` foreign key(\`group_handle\`) references \`entity_group_item\`(\`handle\`) on delete set null on update cascade, primary key (\`handle\`));`);
    this.addSql(`create index \`entity_item_group_handle_index\` on \`entity_item\` (\`group_handle\`);`);

    this.addSql(`create table \`event_status_item\` (\`handle\` text not null, \`description\` text not null, \`color\` text not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, primary key (\`handle\`));`);

    this.addSql(`create table \`event_type_item\` (\`handle\` integer not null primary key autoincrement, \`title\` text not null, \`icon\` text not null default 'mdi-calendar', \`color\` text not null default '#4CAF50', \`created_at\` datetime not null, \`updated_at\` datetime not null, unique (\`handle\`));`);

    this.addSql(`create table \`kpi_aggregation_item\` (\`handle\` text not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, primary key (\`handle\`));`);

    this.addSql(`create table \`kpi_timeframe_item\` (\`handle\` text not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, primary key (\`handle\`));`);

    this.addSql(`create table \`kpi_type_item\` (\`handle\` text not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, primary key (\`handle\`));`);

    this.addSql(`create table \`kpi_item\` (\`handle\` integer not null primary key autoincrement, \`name\` text not null, \`description\` text null, \`aggregation_handle\` text not null, \`field\` text not null, \`type_handle\` text not null default 'ITEM', \`timeframe_field\` text null, \`timeframe_handle\` text null, \`timeframe_interval_handle\` text null, \`filter\` json null, \`group_by\` json null, \`relations\` json null, \`target_entity_handle\` text null, \`created_at\` datetime not null, \`updated_at\` datetime not null, constraint \`kpi_item_aggregation_handle_foreign\` foreign key(\`aggregation_handle\`) references \`kpi_aggregation_item\`(\`handle\`) on update cascade, constraint \`kpi_item_type_handle_foreign\` foreign key(\`type_handle\`) references \`kpi_type_item\`(\`handle\`) on update cascade, constraint \`kpi_item_timeframe_handle_foreign\` foreign key(\`timeframe_handle\`) references \`kpi_timeframe_item\`(\`handle\`) on delete set null on update cascade, constraint \`kpi_item_timeframe_interval_handle_foreign\` foreign key(\`timeframe_interval_handle\`) references \`kpi_timeframe_item\`(\`handle\`) on delete set null on update cascade, constraint \`kpi_item_target_entity_handle_foreign\` foreign key(\`target_entity_handle\`) references \`entity_item\`(\`handle\`) on delete set null on update cascade, unique (\`handle\`));`);
    this.addSql(`create index \`kpi_item_aggregation_handle_index\` on \`kpi_item\` (\`aggregation_handle\`);`);
    this.addSql(`create index \`kpi_item_type_handle_index\` on \`kpi_item\` (\`type_handle\`);`);
    this.addSql(`create index \`kpi_item_timeframe_handle_index\` on \`kpi_item\` (\`timeframe_handle\`);`);
    this.addSql(`create index \`kpi_item_timeframe_interval_handle_index\` on \`kpi_item\` (\`timeframe_interval_handle\`);`);
    this.addSql(`create index \`kpi_item_target_entity_handle_index\` on \`kpi_item\` (\`target_entity_handle\`);`);

    this.addSql(`create table \`language_item\` (\`handle\` text not null, \`name\` text not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, primary key (\`handle\`));`);
    this.addSql(`create unique index \`language_item_name_unique\` on \`language_item\` (\`name\`);`);

    this.addSql(`create table \`note_group_item\` (\`handle\` text not null, \`icon\` text not null default 'mdi-folder', \`created_at\` datetime not null, \`updated_at\` datetime not null, primary key (\`handle\`));`);

    this.addSql(`create table \`person_type_item\` (\`handle\` text not null, \`icon\` text not null default 'mdi-calendar', \`color\` text not null default '#4CAF50', \`created_at\` datetime not null, \`updated_at\` datetime not null, primary key (\`handle\`));`);

    this.addSql(`create table \`product_item\` (\`handle\` integer not null primary key autoincrement, \`title\` text not null, \`name\` text not null, \`version\` text null default '1.0.0', \`description\` text null, \`created_at\` datetime not null, \`updated_at\` datetime not null, unique (\`handle\`));`);

    this.addSql(`create table \`role_stage_item\` (\`handle\` text not null, \`title\` text not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, primary key (\`handle\`));`);

    this.addSql(`create table \`role_item\` (\`handle\` integer not null primary key autoincrement, \`title\` text not null, \`stage_handle\` text not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, constraint \`role_item_stage_handle_foreign\` foreign key(\`stage_handle\`) references \`role_stage_item\`(\`handle\`) on update cascade, unique (\`handle\`));`);
    this.addSql(`create index \`role_item_stage_handle_index\` on \`role_item\` (\`stage_handle\`);`);

    this.addSql(`create table \`permission_item\` (\`entity_handle\` text not null, \`role_handle\` text null, \`allow_read\` integer not null default true, \`allow_insert\` integer not null default true, \`allow_update\` integer not null default true, \`allow_delete\` integer not null default true, \`allow_show\` integer not null default true, \`created_at\` datetime not null, \`updated_at\` datetime not null, constraint \`permission_item_entity_handle_foreign\` foreign key(\`entity_handle\`) references \`entity_item\`(\`handle\`) on update cascade, constraint \`permission_item_role_handle_foreign\` foreign key(\`role_handle\`) references \`role_item\`(\`handle\`) on delete set null on update cascade, primary key (\`entity_handle\`, \`role_handle\`));`);
    this.addSql(`create index \`permission_item_entity_handle_index\` on \`permission_item\` (\`entity_handle\`);`);
    this.addSql(`create index \`permission_item_role_handle_index\` on \`permission_item\` (\`role_handle\`);`);

    this.addSql(`create table \`ticket_priority_item\` (\`handle\` text not null, \`description\` text not null, \`color\` text not null, \`icon\` text not null default 'mdi-chevron-down', \`created_at\` datetime not null, \`updated_at\` datetime not null, primary key (\`handle\`));`);

    this.addSql(`create table \`ticket_status_item\` (\`handle\` text not null, \`description\` text not null, \`color\` text not null, \`icon\` text not null default 'mdi-new-box', \`created_at\` datetime not null, \`updated_at\` datetime not null, primary key (\`handle\`));`);

    this.addSql(`create table \`translation_item\` (\`entity\` text not null, \`property\` text not null, \`language_handle\` text not null, \`value\` text not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, constraint \`translation_item_language_handle_foreign\` foreign key(\`language_handle\`) references \`language_item\`(\`handle\`) on update cascade, primary key (\`entity\`, \`property\`, \`language_handle\`));`);
    this.addSql(`create index \`translation_item_language_handle_index\` on \`translation_item\` (\`language_handle\`);`);

    this.addSql(`create table \`work_hour_item\` (\`handle\` integer not null primary key autoincrement, \`title\` text not null, \`time_from\` time not null, \`time_to\` time not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, unique (\`handle\`));`);

    this.addSql(`create table \`work_hour_week_item\` (\`handle\` integer not null primary key autoincrement, \`title\` text not null, \`monday_handle\` text null, \`tuesday_handle\` text null, \`wednesday_handle\` text null, \`thursday_handle\` text null, \`friday_handle\` text null, \`saturday_handle\` text null, \`sunday_handle\` text null, \`created_at\` datetime not null, \`updated_at\` datetime not null, constraint \`work_hour_week_item_monday_handle_foreign\` foreign key(\`monday_handle\`) references \`work_hour_item\`(\`handle\`) on delete set null on update cascade, constraint \`work_hour_week_item_tuesday_handle_foreign\` foreign key(\`tuesday_handle\`) references \`work_hour_item\`(\`handle\`) on delete set null on update cascade, constraint \`work_hour_week_item_wednesday_handle_foreign\` foreign key(\`wednesday_handle\`) references \`work_hour_item\`(\`handle\`) on delete set null on update cascade, constraint \`work_hour_week_item_thursday_handle_foreign\` foreign key(\`thursday_handle\`) references \`work_hour_item\`(\`handle\`) on delete set null on update cascade, constraint \`work_hour_week_item_friday_handle_foreign\` foreign key(\`friday_handle\`) references \`work_hour_item\`(\`handle\`) on delete set null on update cascade, constraint \`work_hour_week_item_saturday_handle_foreign\` foreign key(\`saturday_handle\`) references \`work_hour_item\`(\`handle\`) on delete set null on update cascade, constraint \`work_hour_week_item_sunday_handle_foreign\` foreign key(\`sunday_handle\`) references \`work_hour_item\`(\`handle\`) on delete set null on update cascade, unique (\`handle\`));`);
    this.addSql(`create index \`work_hour_week_item_monday_handle_index\` on \`work_hour_week_item\` (\`monday_handle\`);`);
    this.addSql(`create index \`work_hour_week_item_tuesday_handle_index\` on \`work_hour_week_item\` (\`tuesday_handle\`);`);
    this.addSql(`create index \`work_hour_week_item_wednesday_handle_index\` on \`work_hour_week_item\` (\`wednesday_handle\`);`);
    this.addSql(`create index \`work_hour_week_item_thursday_handle_index\` on \`work_hour_week_item\` (\`thursday_handle\`);`);
    this.addSql(`create index \`work_hour_week_item_friday_handle_index\` on \`work_hour_week_item\` (\`friday_handle\`);`);
    this.addSql(`create index \`work_hour_week_item_saturday_handle_index\` on \`work_hour_week_item\` (\`saturday_handle\`);`);
    this.addSql(`create index \`work_hour_week_item_sunday_handle_index\` on \`work_hour_week_item\` (\`sunday_handle\`);`);

    this.addSql(`create table \`company_item\` (\`handle\` integer not null primary key autoincrement, \`name\` text not null, \`street\` text not null, \`zip\` text null, \`city\` text null, \`phone\` text null, \`email\` text null, \`website\` text null, \`is_active\` integer not null default true, \`work_week_handle\` text null, \`created_at\` datetime not null, \`updated_at\` datetime not null, constraint \`company_item_work_week_handle_foreign\` foreign key(\`work_week_handle\`) references \`work_hour_week_item\`(\`handle\`) on delete set null on update cascade, unique (\`handle\`));`);
    this.addSql(`create unique index \`company_item_name_unique\` on \`company_item\` (\`name\`);`);
    this.addSql(`create index \`company_item_work_week_handle_index\` on \`company_item\` (\`work_week_handle\`);`);

    this.addSql(`create table \`person_item\` (\`handle\` integer not null primary key autoincrement, \`first_name\` text not null, \`last_name\` text not null, \`login_name\` text null, \`login_password\` text null, \`phone\` text null, \`mobile\` text null, \`email\` text null, \`birth_day\` date null, \`require_password_change\` integer not null default false, \`is_active\` integer not null default true, \`color\` text not null default '#4CAF50', \`created_at\` datetime not null, \`updated_at\` datetime not null, \`company_handle\` text null, \`type_handle\` text null default 'sapling', \`language_handle\` text null, \`work_week_handle\` text null, constraint \`person_item_company_handle_foreign\` foreign key(\`company_handle\`) references \`company_item\`(\`handle\`) on delete set null on update cascade, constraint \`person_item_type_handle_foreign\` foreign key(\`type_handle\`) references \`person_type_item\`(\`handle\`) on delete set null on update cascade, constraint \`person_item_language_handle_foreign\` foreign key(\`language_handle\`) references \`language_item\`(\`handle\`) on delete set null on update cascade, constraint \`person_item_work_week_handle_foreign\` foreign key(\`work_week_handle\`) references \`work_hour_week_item\`(\`handle\`) on delete set null on update cascade, unique (\`handle\`));`);
    this.addSql(`create unique index \`person_item_login_name_unique\` on \`person_item\` (\`login_name\`);`);
    this.addSql(`create index \`person_item_company_handle_index\` on \`person_item\` (\`company_handle\`);`);
    this.addSql(`create index \`person_item_type_handle_index\` on \`person_item\` (\`type_handle\`);`);
    this.addSql(`create index \`person_item_language_handle_index\` on \`person_item\` (\`language_handle\`);`);
    this.addSql(`create index \`person_item_work_week_handle_index\` on \`person_item\` (\`work_week_handle\`);`);

    this.addSql(`create table \`ticket_item\` (\`handle\` integer not null primary key autoincrement, \`number\` text not null, \`title\` text not null, \`problem_description\` text null, \`solution_description\` text null, \`start_date\` datetime not null, \`end_date\` datetime null, \`deadline_date\` datetime null, \`assignee_handle\` text not null, \`creator_handle\` text not null, \`status_handle\` text not null, \`priority_handle\` text null, \`created_at\` datetime not null, \`updated_at\` datetime not null, constraint \`ticket_item_assignee_handle_foreign\` foreign key(\`assignee_handle\`) references \`person_item\`(\`handle\`) on update cascade, constraint \`ticket_item_creator_handle_foreign\` foreign key(\`creator_handle\`) references \`person_item\`(\`handle\`) on update cascade, constraint \`ticket_item_status_handle_foreign\` foreign key(\`status_handle\`) references \`ticket_status_item\`(\`handle\`) on update cascade, constraint \`ticket_item_priority_handle_foreign\` foreign key(\`priority_handle\`) references \`ticket_priority_item\`(\`handle\`) on delete set null on update cascade, unique (\`handle\`));`);
    this.addSql(`create index \`ticket_item_assignee_handle_index\` on \`ticket_item\` (\`assignee_handle\`);`);
    this.addSql(`create index \`ticket_item_creator_handle_index\` on \`ticket_item\` (\`creator_handle\`);`);
    this.addSql(`create index \`ticket_item_status_handle_index\` on \`ticket_item\` (\`status_handle\`);`);
    this.addSql(`create index \`ticket_item_priority_handle_index\` on \`ticket_item\` (\`priority_handle\`);`);

    this.addSql(`create table \`ticket_time_tracking_item\` (\`handle\` integer not null primary key autoincrement, \`title\` text not null, \`description\` text not null, \`person_handle\` text not null, \`ticket_handle\` text not null, \`start_time\` datetime not null, \`end_time\` datetime not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, constraint \`ticket_time_tracking_item_person_handle_foreign\` foreign key(\`person_handle\`) references \`person_item\`(\`handle\`) on update cascade, constraint \`ticket_time_tracking_item_ticket_handle_foreign\` foreign key(\`ticket_handle\`) references \`ticket_item\`(\`handle\`) on update cascade);`);
    this.addSql(`create index \`ticket_time_tracking_item_person_handle_index\` on \`ticket_time_tracking_item\` (\`person_handle\`);`);
    this.addSql(`create index \`ticket_time_tracking_item_ticket_handle_index\` on \`ticket_time_tracking_item\` (\`ticket_handle\`);`);

    this.addSql(`create table \`person_session_item\` (\`handle\` text not null, \`access_token\` text not null, \`refresh_token\` text not null, \`person_handle\` text not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, constraint \`person_session_item_person_handle_foreign\` foreign key(\`person_handle\`) references \`person_item\`(\`handle\`) on update cascade, primary key (\`handle\`));`);
    this.addSql(`create index \`person_session_item_person_handle_index\` on \`person_session_item\` (\`person_handle\`);`);

    this.addSql(`create table \`person_item_roles\` (\`person_item_handle\` text not null, \`role_item_handle\` text not null, constraint \`person_item_roles_person_item_handle_foreign\` foreign key(\`person_item_handle\`) references \`person_item\`(\`handle\`) on delete cascade on update cascade, constraint \`person_item_roles_role_item_handle_foreign\` foreign key(\`role_item_handle\`) references \`role_item\`(\`handle\`) on delete cascade on update cascade, primary key (\`person_item_handle\`, \`role_item_handle\`));`);
    this.addSql(`create index \`person_item_roles_person_item_handle_index\` on \`person_item_roles\` (\`person_item_handle\`);`);
    this.addSql(`create index \`person_item_roles_role_item_handle_index\` on \`person_item_roles\` (\`role_item_handle\`);`);

    this.addSql(`create table \`note_item\` (\`handle\` integer not null primary key autoincrement, \`title\` text not null, \`description\` text null, \`person_handle\` text null, \`group_handle\` text null, \`created_at\` datetime not null, \`updated_at\` datetime not null, constraint \`note_item_person_handle_foreign\` foreign key(\`person_handle\`) references \`person_item\`(\`handle\`) on delete set null on update cascade, constraint \`note_item_group_handle_foreign\` foreign key(\`group_handle\`) references \`note_group_item\`(\`handle\`) on delete set null on update cascade, unique (\`handle\`));`);
    this.addSql(`create index \`note_item_person_handle_index\` on \`note_item\` (\`person_handle\`);`);
    this.addSql(`create index \`note_item_group_handle_index\` on \`note_item\` (\`group_handle\`);`);

    this.addSql(`create table \`favorite_item\` (\`handle\` integer not null primary key autoincrement, \`title\` text not null, \`filter\` json null, \`person_handle\` text not null, \`entity_handle\` text not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, constraint \`favorite_item_person_handle_foreign\` foreign key(\`person_handle\`) references \`person_item\`(\`handle\`) on update cascade, constraint \`favorite_item_entity_handle_foreign\` foreign key(\`entity_handle\`) references \`entity_item\`(\`handle\`) on update cascade);`);
    this.addSql(`create index \`favorite_item_person_handle_index\` on \`favorite_item\` (\`person_handle\`);`);
    this.addSql(`create index \`favorite_item_entity_handle_index\` on \`favorite_item\` (\`entity_handle\`);`);

    this.addSql(`create table \`event_item\` (\`handle\` integer not null primary key autoincrement, \`start_date\` datetime not null, \`end_date\` datetime not null, \`is_all_day\` integer not null default false, \`creator_handle\` text not null, \`title\` text not null, \`description\` text not null, \`type_handle\` text not null, \`ticket_handle\` text null, \`status_handle\` text not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, constraint \`event_item_creator_handle_foreign\` foreign key(\`creator_handle\`) references \`person_item\`(\`handle\`) on update cascade, constraint \`event_item_type_handle_foreign\` foreign key(\`type_handle\`) references \`event_type_item\`(\`handle\`) on update cascade, constraint \`event_item_ticket_handle_foreign\` foreign key(\`ticket_handle\`) references \`ticket_item\`(\`handle\`) on delete set null on update cascade, constraint \`event_item_status_handle_foreign\` foreign key(\`status_handle\`) references \`event_status_item\`(\`handle\`) on update cascade, unique (\`handle\`));`);
    this.addSql(`create index \`event_item_creator_handle_index\` on \`event_item\` (\`creator_handle\`);`);
    this.addSql(`create index \`event_item_type_handle_index\` on \`event_item\` (\`type_handle\`);`);
    this.addSql(`create index \`event_item_ticket_handle_index\` on \`event_item\` (\`ticket_handle\`);`);
    this.addSql(`create index \`event_item_status_handle_index\` on \`event_item\` (\`status_handle\`);`);

    this.addSql(`create table \`person_item_events\` (\`person_item_handle\` text not null, \`event_item_handle\` text not null, constraint \`person_item_events_person_item_handle_foreign\` foreign key(\`person_item_handle\`) references \`person_item\`(\`handle\`) on delete cascade on update cascade, constraint \`person_item_events_event_item_handle_foreign\` foreign key(\`event_item_handle\`) references \`event_item\`(\`handle\`) on delete cascade on update cascade, primary key (\`person_item_handle\`, \`event_item_handle\`));`);
    this.addSql(`create index \`person_item_events_person_item_handle_index\` on \`person_item_events\` (\`person_item_handle\`);`);
    this.addSql(`create index \`person_item_events_event_item_handle_index\` on \`person_item_events\` (\`event_item_handle\`);`);

    this.addSql(`create table \`dashboard_item\` (\`handle\` integer not null primary key autoincrement, \`name\` text not null, \`person_handle\` text not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, constraint \`dashboard_item_person_handle_foreign\` foreign key(\`person_handle\`) references \`person_item\`(\`handle\`) on update cascade, unique (\`handle\`));`);
    this.addSql(`create index \`dashboard_item_person_handle_index\` on \`dashboard_item\` (\`person_handle\`);`);

    this.addSql(`create table \`dashboard_item_kpis\` (\`dashboard_item_handle\` text not null, \`kpi_item_handle\` text not null, constraint \`dashboard_item_kpis_dashboard_item_handle_foreign\` foreign key(\`dashboard_item_handle\`) references \`dashboard_item\`(\`handle\`) on delete cascade on update cascade, constraint \`dashboard_item_kpis_kpi_item_handle_foreign\` foreign key(\`kpi_item_handle\`) references \`kpi_item\`(\`handle\`) on delete cascade on update cascade, primary key (\`dashboard_item_handle\`, \`kpi_item_handle\`));`);
    this.addSql(`create index \`dashboard_item_kpis_dashboard_item_handle_index\` on \`dashboard_item_kpis\` (\`dashboard_item_handle\`);`);
    this.addSql(`create index \`dashboard_item_kpis_kpi_item_handle_index\` on \`dashboard_item_kpis\` (\`kpi_item_handle\`);`);

    this.addSql(`create table \`contract_item\` (\`handle\` integer not null primary key autoincrement, \`title\` text not null, \`description\` text null, \`start_date\` datetime not null, \`end_date\` datetime null, \`is_active\` integer not null default true, \`response_time_hours\` integer not null default 24, \`company_handle\` text not null, \`created_at\` datetime not null, \`updated_at\` datetime not null, constraint \`contract_item_company_handle_foreign\` foreign key(\`company_handle\`) references \`company_item\`(\`handle\`) on update cascade, unique (\`handle\`));`);
    this.addSql(`create index \`contract_item_company_handle_index\` on \`contract_item\` (\`company_handle\`);`);

    this.addSql(`create table \`contract_item_products\` (\`contract_item_handle\` text not null, \`product_item_handle\` text not null, constraint \`contract_item_products_contract_item_handle_foreign\` foreign key(\`contract_item_handle\`) references \`contract_item\`(\`handle\`) on delete cascade on update cascade, constraint \`contract_item_products_product_item_handle_foreign\` foreign key(\`product_item_handle\`) references \`product_item\`(\`handle\`) on delete cascade on update cascade, primary key (\`contract_item_handle\`, \`product_item_handle\`));`);
    this.addSql(`create index \`contract_item_products_contract_item_handle_index\` on \`contract_item_products\` (\`contract_item_handle\`);`);
    this.addSql(`create index \`contract_item_products_product_item_handle_index\` on \`contract_item_products\` (\`product_item_handle\`);`);
  }

}
