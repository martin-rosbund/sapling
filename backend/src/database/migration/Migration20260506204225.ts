import { Migration } from '@mikro-orm/migrations';

export class Migration20260506204225 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "favorite_template_item" ("handle" serial primary key, "name" varchar(128) not null, "entity_handle" varchar(64) not null, "entity_route_handle" int null, "filter" jsonb null, "is_recommended" boolean not null default false, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "holiday_group_item" ("handle" serial primary key, "title" varchar(128) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "holiday_item" ("handle" serial primary key, "title" varchar(128) not null, "description" varchar(1024) null, "group_handle" int not null, "start_date" timestamptz not null, "end_date" timestamptz not null, "is_all_day" boolean not null default true, "icon" varchar(64) not null default 'mdi-calendar-alert', "color" varchar(32) not null default '#C62828', "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "role_item_starter_favorite_templates" ("role_item_handle" int not null, "favorite_template_item_handle" int not null, primary key ("role_item_handle", "favorite_template_item_handle"));`);

    this.addSql(`create table "shared_mailbox_group_item" ("handle" serial primary key, "title" varchar(128) not null, "description" varchar(256) null, "icon" varchar(64) not null default 'mdi-email-lock-outline', "color" varchar(32) not null default '#1565C0', "is_active" boolean not null default true, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "shared_mailbox_item" ("handle" serial primary key, "title" varchar(128) not null, "email" varchar(256) not null, "description" varchar(256) null, "provider_handle" varchar(64) not null default 'azure', "is_active" boolean not null default true, "group_handle" int null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "teams_delivery_status_item" ("handle" varchar(64) not null, "description" varchar(64) not null, "icon" varchar(64) not null default 'mdi-microsoft-teams', "color" varchar(32) not null default '#4CAF50', "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("handle"));`);

    this.addSql(`create table "teams_template_item" ("handle" serial primary key, "name" varchar(128) not null, "description" varchar(256) null, "body_markdown" varchar(8192) not null, "is_default" boolean not null default false, "is_active" boolean not null default true, "entity_handle" varchar(64) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "teams_subscription_item" ("handle" serial primary key, "description" varchar(128) not null, "recipient_field" varchar(64) not null, "is_active" boolean not null default true, "entity_handle" varchar(64) not null, "type_handle" varchar(64) not null default 'afterInsert', "template_handle" int not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "teams_delivery_item" ("handle" serial primary key, "status_handle" varchar(64) null default 'pending', "subscription_handle" int not null, "template_handle" int null, "entity_handle" varchar(64) not null, "created_by_handle" int not null, "recipient_person_handle" int null, "reference_handle" varchar(64) null, "provider" varchar(32) not null default 'azure', "body_markdown" varchar(8192) not null, "body_html" varchar(16384) not null, "request_payload" jsonb null, "response_status_code" int null, "response_body" jsonb null, "provider_message_id" varchar(256) null, "completed_at" timestamptz null, "attempt_count" int not null default 0, "next_retry_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "shared_mailbox_group_item_persons" ("shared_mailbox_group_item_handle" int not null, "person_item_handle" int not null, primary key ("shared_mailbox_group_item_handle", "person_item_handle"));`);

    this.addSql(`create table "dashboard_template_item" ("handle" serial primary key, "name" varchar(128) not null, "description" varchar(512) null, "is_shared" boolean not null default false, "person_handle" int not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`create table "role_item_starter_dashboard_templates" ("role_item_handle" int not null, "dashboard_template_item_handle" int not null, primary key ("role_item_handle", "dashboard_template_item_handle"));`);

    this.addSql(`create table "dashboard_template_item_kpis" ("dashboard_template_item_handle" int not null, "kpi_item_handle" int not null, primary key ("dashboard_template_item_handle", "kpi_item_handle"));`);

    this.addSql(`create table "ai_chat_transcription_item" ("handle" serial primary key, "session_handle" int null, "message_handle" int null, "document_handle" int null, "person_handle" int not null, "provider_handle" varchar(64) null, "model_handle" varchar(64) null, "status" varchar(32) not null default 'processing', "transcript" varchar(16384) null, "detected_language" varchar(16) null, "mime_type" varchar(128) not null, "byte_length" int not null, "duration_seconds" real null, "request_payload" jsonb null, "response_payload" jsonb null, "failure_payload" jsonb null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`);

    this.addSql(`alter table "favorite_template_item" add constraint "favorite_template_item_entity_handle_foreign" foreign key ("entity_handle") references "entity_item" ("handle");`);
    this.addSql(`alter table "favorite_template_item" add constraint "favorite_template_item_entity_route_handle_foreign" foreign key ("entity_route_handle") references "entity_route_item" ("handle") on delete set null;`);

    this.addSql(`alter table "holiday_item" add constraint "holiday_item_group_handle_foreign" foreign key ("group_handle") references "holiday_group_item" ("handle");`);

    this.addSql(`alter table "role_item_starter_favorite_templates" add constraint "role_item_starter_favorite_templates_role_item_handle_foreign" foreign key ("role_item_handle") references "role_item" ("handle") on update cascade on delete cascade;`);
    this.addSql(`alter table "role_item_starter_favorite_templates" add constraint "role_item_starter_favorite_templates_favorite_te_3edaa_foreign" foreign key ("favorite_template_item_handle") references "favorite_template_item" ("handle") on update cascade on delete cascade;`);

    this.addSql(`alter table "shared_mailbox_item" add constraint "shared_mailbox_item_provider_handle_foreign" foreign key ("provider_handle") references "person_type_item" ("handle");`);
    this.addSql(`alter table "shared_mailbox_item" add constraint "shared_mailbox_item_group_handle_foreign" foreign key ("group_handle") references "shared_mailbox_group_item" ("handle") on delete set null;`);

    this.addSql(`alter table "teams_template_item" add constraint "teams_template_item_entity_handle_foreign" foreign key ("entity_handle") references "entity_item" ("handle");`);

    this.addSql(`alter table "teams_subscription_item" add constraint "teams_subscription_item_entity_handle_foreign" foreign key ("entity_handle") references "entity_item" ("handle");`);
    this.addSql(`alter table "teams_subscription_item" add constraint "teams_subscription_item_type_handle_foreign" foreign key ("type_handle") references "webhook_subscription_type_item" ("handle");`);
    this.addSql(`alter table "teams_subscription_item" add constraint "teams_subscription_item_template_handle_foreign" foreign key ("template_handle") references "teams_template_item" ("handle");`);

    this.addSql(`alter table "teams_delivery_item" add constraint "teams_delivery_item_status_handle_foreign" foreign key ("status_handle") references "teams_delivery_status_item" ("handle") on delete set null;`);
    this.addSql(`alter table "teams_delivery_item" add constraint "teams_delivery_item_subscription_handle_foreign" foreign key ("subscription_handle") references "teams_subscription_item" ("handle");`);
    this.addSql(`alter table "teams_delivery_item" add constraint "teams_delivery_item_template_handle_foreign" foreign key ("template_handle") references "teams_template_item" ("handle") on delete set null;`);
    this.addSql(`alter table "teams_delivery_item" add constraint "teams_delivery_item_entity_handle_foreign" foreign key ("entity_handle") references "entity_item" ("handle");`);
    this.addSql(`alter table "teams_delivery_item" add constraint "teams_delivery_item_created_by_handle_foreign" foreign key ("created_by_handle") references "person_item" ("handle");`);
    this.addSql(`alter table "teams_delivery_item" add constraint "teams_delivery_item_recipient_person_handle_foreign" foreign key ("recipient_person_handle") references "person_item" ("handle") on delete set null;`);

    this.addSql(`alter table "shared_mailbox_group_item_persons" add constraint "shared_mailbox_group_item_persons_shared_mailbox_c547c_foreign" foreign key ("shared_mailbox_group_item_handle") references "shared_mailbox_group_item" ("handle") on update cascade on delete cascade;`);
    this.addSql(`alter table "shared_mailbox_group_item_persons" add constraint "shared_mailbox_group_item_persons_person_item_handle_foreign" foreign key ("person_item_handle") references "person_item" ("handle") on update cascade on delete cascade;`);

    this.addSql(`alter table "dashboard_template_item" add constraint "dashboard_template_item_person_handle_foreign" foreign key ("person_handle") references "person_item" ("handle");`);

    this.addSql(`alter table "role_item_starter_dashboard_templates" add constraint "role_item_starter_dashboard_templates_role_item_handle_foreign" foreign key ("role_item_handle") references "role_item" ("handle") on update cascade on delete cascade;`);
    this.addSql(`alter table "role_item_starter_dashboard_templates" add constraint "role_item_starter_dashboard_templates_dashboard__7942f_foreign" foreign key ("dashboard_template_item_handle") references "dashboard_template_item" ("handle") on update cascade on delete cascade;`);

    this.addSql(`alter table "dashboard_template_item_kpis" add constraint "dashboard_template_item_kpis_dashboard_template__45778_foreign" foreign key ("dashboard_template_item_handle") references "dashboard_template_item" ("handle") on update cascade on delete cascade;`);
    this.addSql(`alter table "dashboard_template_item_kpis" add constraint "dashboard_template_item_kpis_kpi_item_handle_foreign" foreign key ("kpi_item_handle") references "kpi_item" ("handle") on update cascade on delete cascade;`);

    this.addSql(`alter table "ai_chat_transcription_item" add constraint "ai_chat_transcription_item_session_handle_foreign" foreign key ("session_handle") references "ai_chat_session_item" ("handle") on delete set null;`);
    this.addSql(`alter table "ai_chat_transcription_item" add constraint "ai_chat_transcription_item_message_handle_foreign" foreign key ("message_handle") references "ai_chat_message_item" ("handle") on delete set null;`);
    this.addSql(`alter table "ai_chat_transcription_item" add constraint "ai_chat_transcription_item_document_handle_foreign" foreign key ("document_handle") references "document_item" ("handle") on delete set null;`);
    this.addSql(`alter table "ai_chat_transcription_item" add constraint "ai_chat_transcription_item_person_handle_foreign" foreign key ("person_handle") references "person_item" ("handle");`);
    this.addSql(`alter table "ai_chat_transcription_item" add constraint "ai_chat_transcription_item_provider_handle_foreign" foreign key ("provider_handle") references "ai_provider_type_item" ("handle") on delete set null;`);
    this.addSql(`alter table "ai_chat_transcription_item" add constraint "ai_chat_transcription_item_model_handle_foreign" foreign key ("model_handle") references "ai_provider_model_item" ("handle") on delete set null;`);

    this.addSql(`alter table "ai_provider_model_item" add "supports_transcription" boolean not null default false, add "embedding_batch_size" int not null default 32, add "vector_chunk_length" int not null default 1200, add "vector_chunk_overlap" int not null default 200, add "vector_search_candidate_multiplier" int not null default 6, add "vector_search_max_candidate_limit" int not null default 60, add "vector_search_max_results" int not null default 10, add "supports_speech" boolean not null default false, add "speech_voice" varchar(64) not null default 'nova', add "speech_speed" real not null default 1, add "speech_mime_type" varchar(128) not null default 'audio/mpeg', add "speech_file_extension" varchar(16) not null default 'mp3', add "speech_max_input_length" int not null default 4000;`);

    this.addSql(`alter table "company_item" add "holiday_group_handle" int null;`);
    this.addSql(`alter table "company_item" add constraint "company_item_holiday_group_handle_foreign" foreign key ("holiday_group_handle") references "holiday_group_item" ("handle") on delete set null;`);

    this.addSql(`alter table "person_item" add "holiday_group_handle" int null;`);
    this.addSql(`alter table "person_item" add constraint "person_item_holiday_group_handle_foreign" foreign key ("holiday_group_handle") references "holiday_group_item" ("handle") on delete set null;`);

    this.addSql(`alter table "favorite_item" add "search" varchar(256) null, add "sort_by" jsonb null, add "entity_route_handle" int null;`);
    this.addSql(`alter table "favorite_item" add constraint "favorite_item_entity_route_handle_foreign" foreign key ("entity_route_handle") references "entity_route_item" ("handle") on delete set null;`);

    this.addSql(`alter table "event_item" add "recurrence_rule" varchar(512) null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "role_item_starter_favorite_templates" drop constraint "role_item_starter_favorite_templates_favorite_te_3edaa_foreign";`);
    this.addSql(`alter table "holiday_item" drop constraint "holiday_item_group_handle_foreign";`);
    this.addSql(`alter table "company_item" drop constraint "company_item_holiday_group_handle_foreign";`);
    this.addSql(`alter table "person_item" drop constraint "person_item_holiday_group_handle_foreign";`);
    this.addSql(`alter table "shared_mailbox_item" drop constraint "shared_mailbox_item_group_handle_foreign";`);
    this.addSql(`alter table "shared_mailbox_group_item_persons" drop constraint "shared_mailbox_group_item_persons_shared_mailbox_c547c_foreign";`);
    this.addSql(`alter table "teams_delivery_item" drop constraint "teams_delivery_item_status_handle_foreign";`);
    this.addSql(`alter table "teams_subscription_item" drop constraint "teams_subscription_item_template_handle_foreign";`);
    this.addSql(`alter table "teams_delivery_item" drop constraint "teams_delivery_item_template_handle_foreign";`);
    this.addSql(`alter table "teams_delivery_item" drop constraint "teams_delivery_item_subscription_handle_foreign";`);
    this.addSql(`alter table "role_item_starter_dashboard_templates" drop constraint "role_item_starter_dashboard_templates_dashboard__7942f_foreign";`);
    this.addSql(`alter table "dashboard_template_item_kpis" drop constraint "dashboard_template_item_kpis_dashboard_template__45778_foreign";`);

    this.addSql(`drop table if exists "favorite_template_item" cascade;`);
    this.addSql(`drop table if exists "holiday_group_item" cascade;`);
    this.addSql(`drop table if exists "holiday_item" cascade;`);
    this.addSql(`drop table if exists "role_item_starter_favorite_templates" cascade;`);
    this.addSql(`drop table if exists "shared_mailbox_group_item" cascade;`);
    this.addSql(`drop table if exists "shared_mailbox_item" cascade;`);
    this.addSql(`drop table if exists "teams_delivery_status_item" cascade;`);
    this.addSql(`drop table if exists "teams_template_item" cascade;`);
    this.addSql(`drop table if exists "teams_subscription_item" cascade;`);
    this.addSql(`drop table if exists "teams_delivery_item" cascade;`);
    this.addSql(`drop table if exists "shared_mailbox_group_item_persons" cascade;`);
    this.addSql(`drop table if exists "dashboard_template_item" cascade;`);
    this.addSql(`drop table if exists "role_item_starter_dashboard_templates" cascade;`);
    this.addSql(`drop table if exists "dashboard_template_item_kpis" cascade;`);
    this.addSql(`drop table if exists "ai_chat_transcription_item" cascade;`);

    this.addSql(`alter table "favorite_item" drop constraint "favorite_item_entity_route_handle_foreign";`);

    this.addSql(`alter table "ai_provider_model_item" drop column "supports_transcription", drop column "embedding_batch_size", drop column "vector_chunk_length", drop column "vector_chunk_overlap", drop column "vector_search_candidate_multiplier", drop column "vector_search_max_candidate_limit", drop column "vector_search_max_results", drop column "supports_speech", drop column "speech_voice", drop column "speech_speed", drop column "speech_mime_type", drop column "speech_file_extension", drop column "speech_max_input_length";`);

    this.addSql(`alter table "company_item" drop column "holiday_group_handle";`);

    this.addSql(`alter table "event_item" drop column "recurrence_rule";`);

    this.addSql(`alter table "favorite_item" drop column "search", drop column "sort_by", drop column "entity_route_handle";`);

    this.addSql(`alter table "person_item" drop column "holiday_group_handle";`);
  }

}
