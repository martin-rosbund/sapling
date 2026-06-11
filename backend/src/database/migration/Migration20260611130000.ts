import { Migration } from '@mikro-orm/migrations';

export class Migration20260611130000 extends Migration {
  override up(): void {
    this.addSql(
      `create table "ai_agent_version_item" ("handle" serial primary key, "agent_handle" varchar(64) not null, "version" int not null default 1, "status" varchar(16) not null default 'draft', "prompt_markdown" text not null, "changelog" text null, "provider_handle" varchar(64) null, "model_handle" varchar(64) null, "allowed_entity_handles" jsonb null, "allowed_knowledge_entity_handles" jsonb null, "allowed_internal_tools" jsonb null, "allowed_external_tools" jsonb null, "activated_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );
    this.addSql(
      `alter table "ai_agent_version_item" add constraint "ai_agent_version_item_agent_handle_foreign" foreign key ("agent_handle") references "ai_agent_item" ("handle") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "ai_agent_version_item" add constraint "ai_agent_version_item_provider_handle_foreign" foreign key ("provider_handle") references "ai_provider_type_item" ("handle") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "ai_agent_version_item" add constraint "ai_agent_version_item_model_handle_foreign" foreign key ("model_handle") references "ai_provider_model_item" ("handle") on update cascade on delete set null;`,
    );
    this.addSql(
      `create index "ai_agent_version_item_agent_status_index" on "ai_agent_version_item" ("agent_handle", "status");`,
    );

    this.addSql(
      `create table "ai_agent_playbook_item" ("handle" varchar(64) not null, "agent_handle" varchar(64) not null, "title" varchar(160) not null, "description" text null, "trigger_entity_handles" jsonb null, "steps" jsonb not null, "expected_output" text null, "is_active" boolean not null default true, "sort_order" int not null default 100, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "ai_agent_playbook_item_pkey" primary key ("handle"));`,
    );
    this.addSql(
      `alter table "ai_agent_playbook_item" add constraint "ai_agent_playbook_item_agent_handle_foreign" foreign key ("agent_handle") references "ai_agent_item" ("handle") on update cascade on delete cascade;`,
    );

    this.addSql(
      `create table "ai_agent_memory_item" ("handle" serial primary key, "agent_handle" varchar(64) not null, "type" varchar(32) not null, "title" varchar(160) not null, "content_markdown" text not null, "entity_scope_handles" jsonb null, "is_active" boolean not null default true, "sort_order" int not null default 100, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );
    this.addSql(
      `alter table "ai_agent_memory_item" add constraint "ai_agent_memory_item_agent_handle_foreign" foreign key ("agent_handle") references "ai_agent_item" ("handle") on update cascade on delete cascade;`,
    );
    this.addSql(
      `create table "ai_agent_memory_item_roles" ("ai_agent_memory_item_handle" int not null, "role_item_handle" int not null, constraint "ai_agent_memory_item_roles_pkey" primary key ("ai_agent_memory_item_handle", "role_item_handle"));`,
    );
    this.addSql(
      `alter table "ai_agent_memory_item_roles" add constraint "ai_agent_memory_item_roles_memory_foreign" foreign key ("ai_agent_memory_item_handle") references "ai_agent_memory_item" ("handle") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "ai_agent_memory_item_roles" add constraint "ai_agent_memory_item_roles_role_foreign" foreign key ("role_item_handle") references "role_item" ("handle") on update cascade on delete cascade;`,
    );

    this.addSql(
      `create table "ai_agent_evaluation_item" ("handle" serial primary key, "agent_handle" varchar(64) not null, "agent_version_handle" int null, "title" varchar(160) not null, "prompt" text not null, "expected_criteria" text null, "target_entity_handle" varchar(64) null, "target_record_handle" varchar(128) null, "status" varchar(32) not null default 'needsReview', "rating" int null, "comment" text null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );
    this.addSql(
      `alter table "ai_agent_evaluation_item" add constraint "ai_agent_evaluation_item_agent_handle_foreign" foreign key ("agent_handle") references "ai_agent_item" ("handle") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "ai_agent_evaluation_item" add constraint "ai_agent_evaluation_item_agent_version_handle_foreign" foreign key ("agent_version_handle") references "ai_agent_version_item" ("handle") on update cascade on delete set null;`,
    );

    this.addSql(
      `create table "ai_agent_run_item" ("handle" serial primary key, "session_handle" int null, "message_handle" int null, "person_handle" int not null, "agent_handle" varchar(64) null, "agent_version_handle" int null, "playbook_handle" varchar(64) null, "status" varchar(32) not null default 'running', "provider" varchar(64) null, "model" varchar(128) null, "context_entity_handle" varchar(64) null, "context_record_handle" varchar(128) null, "duration_ms" int null, "tool_calls" jsonb null, "sources" jsonb null, "pending_actions" jsonb null, "usage_payload" jsonb null, "response_text" text null, "error_payload" jsonb null, "started_at" timestamptz not null, "completed_at" timestamptz null, "updated_at" timestamptz not null);`,
    );
    this.addSql(
      `alter table "ai_agent_run_item" add constraint "ai_agent_run_item_session_handle_foreign" foreign key ("session_handle") references "ai_chat_session_item" ("handle") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "ai_agent_run_item" add constraint "ai_agent_run_item_message_handle_foreign" foreign key ("message_handle") references "ai_chat_message_item" ("handle") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "ai_agent_run_item" add constraint "ai_agent_run_item_person_handle_foreign" foreign key ("person_handle") references "person_item" ("handle") on update cascade;`,
    );
    this.addSql(
      `alter table "ai_agent_run_item" add constraint "ai_agent_run_item_agent_handle_foreign" foreign key ("agent_handle") references "ai_agent_item" ("handle") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "ai_agent_run_item" add constraint "ai_agent_run_item_agent_version_handle_foreign" foreign key ("agent_version_handle") references "ai_agent_version_item" ("handle") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "ai_agent_run_item" add constraint "ai_agent_run_item_playbook_handle_foreign" foreign key ("playbook_handle") references "ai_agent_playbook_item" ("handle") on update cascade on delete set null;`,
    );
    this.addSql(
      `create index "ai_agent_run_item_agent_started_index" on "ai_agent_run_item" ("agent_handle", "started_at");`,
    );

    this.addSql(
      `alter table "ai_chat_session_item" add column "agent_version_handle" int null, add column "playbook_handle" varchar(64) null, add column "context_entity_handle" varchar(64) null, add column "context_record_handle" varchar(128) null;`,
    );
    this.addSql(
      `alter table "ai_chat_session_item" add constraint "ai_chat_session_item_agent_version_handle_foreign" foreign key ("agent_version_handle") references "ai_agent_version_item" ("handle") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "ai_chat_session_item" add constraint "ai_chat_session_item_playbook_handle_foreign" foreign key ("playbook_handle") references "ai_agent_playbook_item" ("handle") on update cascade on delete set null;`,
    );
  }

  override down(): void {
    this.addSql(
      `alter table "ai_chat_session_item" drop constraint if exists "ai_chat_session_item_playbook_handle_foreign";`,
    );
    this.addSql(
      `alter table "ai_chat_session_item" drop constraint if exists "ai_chat_session_item_agent_version_handle_foreign";`,
    );
    this.addSql(
      `alter table "ai_chat_session_item" drop column if exists "agent_version_handle", drop column if exists "playbook_handle", drop column if exists "context_entity_handle", drop column if exists "context_record_handle";`,
    );
    this.addSql(`drop table if exists "ai_agent_run_item" cascade;`);
    this.addSql(`drop table if exists "ai_agent_evaluation_item" cascade;`);
    this.addSql(`drop table if exists "ai_agent_memory_item_roles" cascade;`);
    this.addSql(`drop table if exists "ai_agent_memory_item" cascade;`);
    this.addSql(`drop table if exists "ai_agent_playbook_item" cascade;`);
    this.addSql(`drop table if exists "ai_agent_version_item" cascade;`);
  }
}
