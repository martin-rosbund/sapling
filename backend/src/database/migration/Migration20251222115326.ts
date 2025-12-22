import { Migration } from '@mikro-orm/migrations';

export class Migration20251222115326 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "entity_group_item" ("handle" varchar(64) not null, "icon" varchar(64) not null default 'mdi-folder', "is_expanded" boolean not null default true, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "entity_group_item_pkey" primary key ("handle"));`);

    this.addSql(`create table "entity_item" ("handle" varchar(64) not null, "icon" varchar(64) not null default 'square-rounded', "route" varchar(128) null, "can_read" boolean not null default true, "can_insert" boolean not null default false, "can_update" boolean not null default false, "can_delete" boolean not null default false, "can_show" boolean not null default false, "group_handle" varchar(64) null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "entity_item_pkey" primary key ("handle"));`);

    this.addSql(`create table "event_delivery_status_item" ("handle" varchar(64) not null, "description" varchar(64) not null, "icon" varchar(64) not null default 'mdi-calendar', "color" varchar(32) not null default '#4CAF50', "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "event_delivery_status_item_pkey" primary key ("handle"));`);

    this.addSql(`create table "event_status_item" ("handle" varchar(64) not null, "description" varchar(64) not null, "color" varchar(16) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "event_status_item_pkey" primary key ("handle"));`);

    this.addSql(`create table "event_type_item" ("handle" varchar(64) not null, "title" varchar(128) not null, "icon" varchar(64) not null default 'mdi-calendar', "color" varchar(32) not null default '#4CAF50', "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "event_type_item_pkey" primary key ("handle"));`);

    this.addSql(`create table "kpi_aggregation_item" ("handle" varchar(64) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "kpi_aggregation_item_pkey" primary key ("handle"));`);

    this.addSql(`create table "kpi_timeframe_item" ("handle" varchar(64) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "kpi_timeframe_item_pkey" primary key ("handle"));`);

    this.addSql(`create table "kpi_type_item" ("handle" varchar(64) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "kpi_type_item_pkey" primary key ("handle"));`);

    this.addSql(`create table "kpi_item" ("handle" serial primary key, "name" varchar(128) not null, "description" varchar(256) null, "aggregation_handle" varchar(64) not null, "field" varchar(128) not null, "type_handle" varchar(64) not null default 'ITEM', "timeframe_field" varchar(128) null, "timeframe_handle" varchar(64) null, "timeframe_interval_handle" varchar(64) null, "filter" jsonb null, "group_by" jsonb null, "relation_field" varchar(128) null, "relation_handle" varchar(64) null, "target_entity_handle" varchar(64) null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "language_item" ("handle" varchar(64) not null, "name" varchar(64) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "language_item_pkey" primary key ("handle"));`);
    this.addSql(`alter table "language_item" add constraint "language_item_name_unique" unique ("name");`);

    this.addSql(`create table "note_group_item" ("handle" varchar(64) not null, "icon" varchar(64) not null default 'mdi-folder', "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "note_group_item_pkey" primary key ("handle"));`);

    this.addSql(`create table "person_type_item" ("handle" varchar(64) not null, "icon" varchar(64) not null default 'mdi-calendar', "color" varchar(32) not null default '#4CAF50', "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "person_type_item_pkey" primary key ("handle"));`);

    this.addSql(`create table "product_item" ("handle" serial primary key, "title" varchar(128) not null, "name" varchar(64) not null, "version" varchar(32) null default '1.0.0', "description" varchar(512) null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "role_stage_item" ("handle" varchar(64) not null, "title" varchar(64) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "role_stage_item_pkey" primary key ("handle"));`);

    this.addSql(`create table "role_item" ("handle" serial primary key, "title" varchar(64) not null, "stage_handle" varchar(64) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "permission_item" ("entity_handle" varchar(64) not null, "role_handle" int not null, "allow_read" boolean not null default true, "allow_insert" boolean not null default true, "allow_update" boolean not null default true, "allow_delete" boolean not null default true, "allow_show" boolean not null default true, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "permission_item_pkey" primary key ("entity_handle", "role_handle"));`);

    this.addSql(`create table "ticket_priority_item" ("handle" varchar(64) not null, "description" varchar(64) not null, "color" varchar(16) not null, "icon" varchar(64) not null default 'mdi-chevron-down', "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "ticket_priority_item_pkey" primary key ("handle"));`);

    this.addSql(`create table "ticket_status_item" ("handle" varchar(64) not null, "description" varchar(64) not null, "color" varchar(16) not null, "icon" varchar(64) not null default 'mdi-new-box', "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "ticket_status_item_pkey" primary key ("handle"));`);

    this.addSql(`create table "translation_item" ("entity" varchar(64) not null, "property" varchar(64) not null, "language_handle" varchar(64) not null, "value" varchar(1024) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "translation_item_pkey" primary key ("entity", "property", "language_handle"));`);

    this.addSql(`create table "webhook_authentication_api_key_item" ("handle" serial primary key, "description" varchar(128) not null, "header_name" varchar(128) not null, "api_key" varchar(256) null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "webhook_authentication_oauth2item" ("handle" serial primary key, "description" varchar(128) not null, "client_id" varchar(128) not null, "client_secret" varchar(256) not null, "token_url" varchar(256) not null, "scope" varchar(256) null, "cached_token" varchar(256) null, "token_expires_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "webhook_authentication_type_item" ("handle" varchar(64) not null, "description" varchar(64) not null, "icon" varchar(64) not null default 'mdi-calendar', "color" varchar(32) not null default '#4CAF50', "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "webhook_authentication_type_item_pkey" primary key ("handle"));`);

    this.addSql(`create table "webhook_delivery_status_item" ("handle" varchar(64) not null, "description" varchar(64) not null, "icon" varchar(64) not null default 'mdi-calendar', "color" varchar(32) not null default '#4CAF50', "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "webhook_delivery_status_item_pkey" primary key ("handle"));`);

    this.addSql(`create table "webhook_subscription_type_item" ("handle" varchar(64) not null, "description" varchar(64) not null, "icon" varchar(64) not null default 'mdi-calendar', "color" varchar(32) not null default '#4CAF50', "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "webhook_subscription_type_item_pkey" primary key ("handle"));`);

    this.addSql(`create table "webhook_subscription_item" ("handle" serial primary key, "description" varchar(128) not null, "url" varchar(256) not null, "custom_headers" jsonb null, "is_active" boolean not null default true, "signing_secret" varchar(128) null, "entity_handle" varchar(64) not null, "type_handle" varchar(64) not null default 'afterInsert', "authentication_type_handle" varchar(64) null default 'none', "authentication_oauth2_handle" int null, "authentication_api_key_handle" int null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "webhook_delivery_item" ("handle" serial primary key, "status_handle" varchar(64) null default 'pending', "subscription_handle" int not null, "payload" jsonb not null, "request_headers" jsonb null, "response_status_code" int null default 200, "response_body" jsonb null, "response_headers" jsonb null, "completed_at" timestamptz null, "attempt_count" int not null default 0, "next_retry_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "work_hour_item" ("handle" serial primary key, "title" varchar(64) not null, "time_from" time(0) not null, "time_to" time(0) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "work_hour_week_item" ("handle" serial primary key, "title" varchar(64) not null, "monday_handle" int null, "tuesday_handle" int null, "wednesday_handle" int null, "thursday_handle" int null, "friday_handle" int null, "saturday_handle" int null, "sunday_handle" int null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "company_item" ("handle" serial primary key, "name" varchar(128) not null, "street" varchar(128) not null, "zip" varchar(16) null, "city" varchar(64) null, "phone" varchar(32) null, "email" varchar(128) null, "website" varchar(128) null, "is_active" boolean not null default true, "work_week_handle" int null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);
    this.addSql(`alter table "company_item" add constraint "company_item_name_unique" unique ("name");`);

    this.addSql(`create table "person_item" ("handle" serial primary key, "first_name" varchar(64) not null, "last_name" varchar(64) not null, "login_name" varchar(64) null, "login_password" varchar(128) null, "phone" varchar(32) null, "mobile" varchar(32) null, "email" varchar(128) null, "birth_day" date null, "require_password_change" boolean not null default false, "is_active" boolean not null default true, "color" varchar(32) not null default '#4CAF50', "created_at" timestamptz not null, "updated_at" timestamptz not null, "company_handle" int null, "type_handle" varchar(64) null default 'sapling', "language_handle" varchar(64) null default 'de', "work_week_handle" int null);`);
    this.addSql(`alter table "person_item" add constraint "person_item_login_name_unique" unique ("login_name");`);

    this.addSql(`create table "ticket_item" ("handle" serial primary key, "number" varchar(32) not null, "title" varchar(128) not null, "problem_description" varchar(1024) null, "solution_description" varchar(1024) null, "start_date" timestamptz not null, "end_date" timestamptz null, "deadline_date" timestamptz null, "assignee_handle" int not null, "creator_handle" int not null, "status_handle" varchar(64) not null, "priority_handle" varchar(64) null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "ticket_time_tracking_item" ("handle" serial primary key, "title" varchar(64) not null, "description" varchar(256) not null, "person_handle" int not null, "ticket_handle" int not null, "start_time" timestamptz not null, "end_time" timestamptz not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "person_session_item" ("person_handle" int not null, "number" varchar(128) not null, "access_token" varchar(2048) not null, "refresh_token" varchar(2048) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "person_session_item_pkey" primary key ("person_handle"));`);

    this.addSql(`create table "person_item_roles" ("person_item_handle" int not null, "role_item_handle" int not null, constraint "person_item_roles_pkey" primary key ("person_item_handle", "role_item_handle"));`);

    this.addSql(`create table "note_item" ("handle" serial primary key, "title" varchar(128) not null, "description" varchar(1024) null, "person_handle" int null, "group_handle" varchar(64) null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "favorite_item" ("handle" serial primary key, "title" varchar(128) not null, "filter" jsonb null, "person_handle" int not null, "entity_handle" varchar(64) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "event_item" ("handle" serial primary key, "start_date" timestamptz not null, "end_date" timestamptz not null, "is_all_day" boolean not null default false, "creator_handle" int not null, "title" varchar(128) not null, "description" varchar(1024) not null, "online_meeting_url" varchar(512) null, "transaction_handle" varchar(128) not null, "type_handle" varchar(64) not null default 'internal', "ticket_handle" int null, "status_handle" varchar(64) not null default 'scheduled', "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "person_item_events" ("person_item_handle" int not null, "event_item_handle" int not null, constraint "person_item_events_pkey" primary key ("person_item_handle", "event_item_handle"));`);

    this.addSql(`create table "event_google_item" ("event_handle" int not null, "reference_handle" varchar(128) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "event_google_item_pkey" primary key ("event_handle"));`);

    this.addSql(`create table "event_delivery_item" ("handle" serial primary key, "status_handle" varchar(64) null default 'pending', "event_handle" int not null, "payload" jsonb not null, "request_headers" jsonb null, "response_status_code" int null default 200, "response_body" jsonb null, "response_headers" jsonb null, "completed_at" timestamptz null, "attempt_count" int not null default 0, "next_retry_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "event_azure_item" ("event_handle" int not null, "reference_handle" varchar(128) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "event_azure_item_pkey" primary key ("event_handle"));`);

    this.addSql(`create table "dashboard_item" ("handle" serial primary key, "name" varchar(128) not null, "person_handle" int not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "dashboard_item_kpis" ("dashboard_item_handle" int not null, "kpi_item_handle" int not null, constraint "dashboard_item_kpis_pkey" primary key ("dashboard_item_handle", "kpi_item_handle"));`);

    this.addSql(`create table "contract_item" ("handle" serial primary key, "title" varchar(128) not null, "description" varchar(512) null, "start_date" timestamptz not null, "end_date" timestamptz null, "is_active" boolean not null default true, "response_time_hours" int not null default 24, "company_handle" int null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "contract_item_products" ("contract_item_handle" int not null, "product_item_handle" int not null, constraint "contract_item_products_pkey" primary key ("contract_item_handle", "product_item_handle"));`);

    this.addSql(`alter table "entity_item" add constraint "entity_item_group_handle_foreign" foreign key ("group_handle") references "entity_group_item" ("handle") on update cascade on delete set null;`);

    this.addSql(`alter table "kpi_item" add constraint "kpi_item_aggregation_handle_foreign" foreign key ("aggregation_handle") references "kpi_aggregation_item" ("handle") on update cascade;`);
    this.addSql(`alter table "kpi_item" add constraint "kpi_item_type_handle_foreign" foreign key ("type_handle") references "kpi_type_item" ("handle") on update cascade;`);
    this.addSql(`alter table "kpi_item" add constraint "kpi_item_timeframe_handle_foreign" foreign key ("timeframe_handle") references "kpi_timeframe_item" ("handle") on update cascade on delete set null;`);
    this.addSql(`alter table "kpi_item" add constraint "kpi_item_timeframe_interval_handle_foreign" foreign key ("timeframe_interval_handle") references "kpi_timeframe_item" ("handle") on update cascade on delete set null;`);
    this.addSql(`alter table "kpi_item" add constraint "kpi_item_relation_handle_foreign" foreign key ("relation_handle") references "entity_item" ("handle") on update cascade on delete set null;`);
    this.addSql(`alter table "kpi_item" add constraint "kpi_item_target_entity_handle_foreign" foreign key ("target_entity_handle") references "entity_item" ("handle") on update cascade on delete set null;`);

    this.addSql(`alter table "role_item" add constraint "role_item_stage_handle_foreign" foreign key ("stage_handle") references "role_stage_item" ("handle") on update cascade;`);

    this.addSql(`alter table "permission_item" add constraint "permission_item_entity_handle_foreign" foreign key ("entity_handle") references "entity_item" ("handle") on update cascade;`);
    this.addSql(`alter table "permission_item" add constraint "permission_item_role_handle_foreign" foreign key ("role_handle") references "role_item" ("handle") on update cascade;`);

    this.addSql(`alter table "translation_item" add constraint "translation_item_language_handle_foreign" foreign key ("language_handle") references "language_item" ("handle") on update cascade;`);

    this.addSql(`alter table "webhook_subscription_item" add constraint "webhook_subscription_item_entity_handle_foreign" foreign key ("entity_handle") references "entity_item" ("handle") on update cascade;`);
    this.addSql(`alter table "webhook_subscription_item" add constraint "webhook_subscription_item_type_handle_foreign" foreign key ("type_handle") references "webhook_subscription_type_item" ("handle") on update cascade;`);
    this.addSql(`alter table "webhook_subscription_item" add constraint "webhook_subscription_item_authentication_type_handle_foreign" foreign key ("authentication_type_handle") references "webhook_authentication_type_item" ("handle") on update cascade on delete set null;`);
    this.addSql(`alter table "webhook_subscription_item" add constraint "webhook_subscription_item_authentication_oauth2_handle_foreign" foreign key ("authentication_oauth2_handle") references "webhook_authentication_oauth2item" ("handle") on update cascade on delete set null;`);
    this.addSql(`alter table "webhook_subscription_item" add constraint "webhook_subscription_item_authentication_api_key_handle_foreign" foreign key ("authentication_api_key_handle") references "webhook_authentication_api_key_item" ("handle") on update cascade on delete set null;`);

    this.addSql(`alter table "webhook_delivery_item" add constraint "webhook_delivery_item_status_handle_foreign" foreign key ("status_handle") references "webhook_delivery_status_item" ("handle") on update cascade on delete set null;`);
    this.addSql(`alter table "webhook_delivery_item" add constraint "webhook_delivery_item_subscription_handle_foreign" foreign key ("subscription_handle") references "webhook_subscription_item" ("handle") on update cascade;`);

    this.addSql(`alter table "work_hour_week_item" add constraint "work_hour_week_item_monday_handle_foreign" foreign key ("monday_handle") references "work_hour_item" ("handle") on update cascade on delete set null;`);
    this.addSql(`alter table "work_hour_week_item" add constraint "work_hour_week_item_tuesday_handle_foreign" foreign key ("tuesday_handle") references "work_hour_item" ("handle") on update cascade on delete set null;`);
    this.addSql(`alter table "work_hour_week_item" add constraint "work_hour_week_item_wednesday_handle_foreign" foreign key ("wednesday_handle") references "work_hour_item" ("handle") on update cascade on delete set null;`);
    this.addSql(`alter table "work_hour_week_item" add constraint "work_hour_week_item_thursday_handle_foreign" foreign key ("thursday_handle") references "work_hour_item" ("handle") on update cascade on delete set null;`);
    this.addSql(`alter table "work_hour_week_item" add constraint "work_hour_week_item_friday_handle_foreign" foreign key ("friday_handle") references "work_hour_item" ("handle") on update cascade on delete set null;`);
    this.addSql(`alter table "work_hour_week_item" add constraint "work_hour_week_item_saturday_handle_foreign" foreign key ("saturday_handle") references "work_hour_item" ("handle") on update cascade on delete set null;`);
    this.addSql(`alter table "work_hour_week_item" add constraint "work_hour_week_item_sunday_handle_foreign" foreign key ("sunday_handle") references "work_hour_item" ("handle") on update cascade on delete set null;`);

    this.addSql(`alter table "company_item" add constraint "company_item_work_week_handle_foreign" foreign key ("work_week_handle") references "work_hour_week_item" ("handle") on update cascade on delete set null;`);

    this.addSql(`alter table "person_item" add constraint "person_item_company_handle_foreign" foreign key ("company_handle") references "company_item" ("handle") on update cascade on delete set null;`);
    this.addSql(`alter table "person_item" add constraint "person_item_type_handle_foreign" foreign key ("type_handle") references "person_type_item" ("handle") on update cascade on delete set null;`);
    this.addSql(`alter table "person_item" add constraint "person_item_language_handle_foreign" foreign key ("language_handle") references "language_item" ("handle") on update cascade on delete set null;`);
    this.addSql(`alter table "person_item" add constraint "person_item_work_week_handle_foreign" foreign key ("work_week_handle") references "work_hour_week_item" ("handle") on update cascade on delete set null;`);

    this.addSql(`alter table "ticket_item" add constraint "ticket_item_assignee_handle_foreign" foreign key ("assignee_handle") references "person_item" ("handle") on update cascade;`);
    this.addSql(`alter table "ticket_item" add constraint "ticket_item_creator_handle_foreign" foreign key ("creator_handle") references "person_item" ("handle") on update cascade;`);
    this.addSql(`alter table "ticket_item" add constraint "ticket_item_status_handle_foreign" foreign key ("status_handle") references "ticket_status_item" ("handle") on update cascade;`);
    this.addSql(`alter table "ticket_item" add constraint "ticket_item_priority_handle_foreign" foreign key ("priority_handle") references "ticket_priority_item" ("handle") on update cascade on delete set null;`);

    this.addSql(`alter table "ticket_time_tracking_item" add constraint "ticket_time_tracking_item_person_handle_foreign" foreign key ("person_handle") references "person_item" ("handle") on update cascade;`);
    this.addSql(`alter table "ticket_time_tracking_item" add constraint "ticket_time_tracking_item_ticket_handle_foreign" foreign key ("ticket_handle") references "ticket_item" ("handle") on update cascade;`);

    this.addSql(`alter table "person_session_item" add constraint "person_session_item_person_handle_foreign" foreign key ("person_handle") references "person_item" ("handle") on update cascade on delete cascade;`);

    this.addSql(`alter table "person_item_roles" add constraint "person_item_roles_person_item_handle_foreign" foreign key ("person_item_handle") references "person_item" ("handle") on update cascade on delete cascade;`);
    this.addSql(`alter table "person_item_roles" add constraint "person_item_roles_role_item_handle_foreign" foreign key ("role_item_handle") references "role_item" ("handle") on update cascade on delete cascade;`);

    this.addSql(`alter table "note_item" add constraint "note_item_person_handle_foreign" foreign key ("person_handle") references "person_item" ("handle") on update cascade on delete set null;`);
    this.addSql(`alter table "note_item" add constraint "note_item_group_handle_foreign" foreign key ("group_handle") references "note_group_item" ("handle") on update cascade on delete set null;`);

    this.addSql(`alter table "favorite_item" add constraint "favorite_item_person_handle_foreign" foreign key ("person_handle") references "person_item" ("handle") on update cascade;`);
    this.addSql(`alter table "favorite_item" add constraint "favorite_item_entity_handle_foreign" foreign key ("entity_handle") references "entity_item" ("handle") on update cascade;`);

    this.addSql(`alter table "event_item" add constraint "event_item_creator_handle_foreign" foreign key ("creator_handle") references "person_item" ("handle") on update cascade;`);
    this.addSql(`alter table "event_item" add constraint "event_item_type_handle_foreign" foreign key ("type_handle") references "event_type_item" ("handle") on update cascade;`);
    this.addSql(`alter table "event_item" add constraint "event_item_ticket_handle_foreign" foreign key ("ticket_handle") references "ticket_item" ("handle") on update cascade on delete set null;`);
    this.addSql(`alter table "event_item" add constraint "event_item_status_handle_foreign" foreign key ("status_handle") references "event_status_item" ("handle") on update cascade;`);

    this.addSql(`alter table "person_item_events" add constraint "person_item_events_person_item_handle_foreign" foreign key ("person_item_handle") references "person_item" ("handle") on update cascade on delete cascade;`);
    this.addSql(`alter table "person_item_events" add constraint "person_item_events_event_item_handle_foreign" foreign key ("event_item_handle") references "event_item" ("handle") on update cascade on delete cascade;`);

    this.addSql(`alter table "event_google_item" add constraint "event_google_item_event_handle_foreign" foreign key ("event_handle") references "event_item" ("handle") on update cascade on delete cascade;`);

    this.addSql(`alter table "event_delivery_item" add constraint "event_delivery_item_status_handle_foreign" foreign key ("status_handle") references "event_delivery_status_item" ("handle") on update cascade on delete set null;`);
    this.addSql(`alter table "event_delivery_item" add constraint "event_delivery_item_event_handle_foreign" foreign key ("event_handle") references "event_item" ("handle") on update cascade;`);

    this.addSql(`alter table "event_azure_item" add constraint "event_azure_item_event_handle_foreign" foreign key ("event_handle") references "event_item" ("handle") on update cascade on delete cascade;`);

    this.addSql(`alter table "dashboard_item" add constraint "dashboard_item_person_handle_foreign" foreign key ("person_handle") references "person_item" ("handle") on update cascade;`);

    this.addSql(`alter table "dashboard_item_kpis" add constraint "dashboard_item_kpis_dashboard_item_handle_foreign" foreign key ("dashboard_item_handle") references "dashboard_item" ("handle") on update cascade on delete cascade;`);
    this.addSql(`alter table "dashboard_item_kpis" add constraint "dashboard_item_kpis_kpi_item_handle_foreign" foreign key ("kpi_item_handle") references "kpi_item" ("handle") on update cascade on delete cascade;`);

    this.addSql(`alter table "contract_item" add constraint "contract_item_company_handle_foreign" foreign key ("company_handle") references "company_item" ("handle") on update cascade on delete set null;`);

    this.addSql(`alter table "contract_item_products" add constraint "contract_item_products_contract_item_handle_foreign" foreign key ("contract_item_handle") references "contract_item" ("handle") on update cascade on delete cascade;`);
    this.addSql(`alter table "contract_item_products" add constraint "contract_item_products_product_item_handle_foreign" foreign key ("product_item_handle") references "product_item" ("handle") on update cascade on delete cascade;`);
  }

}
