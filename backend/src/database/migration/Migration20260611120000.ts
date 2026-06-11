import { Migration } from '@mikro-orm/migrations';

export class Migration20260611120000 extends Migration {
  override up(): void {
    this.addSql(
      `create table "ai_agent_item" ("handle" varchar(64) not null, "title" varchar(128) not null, "description" text null, "icon" varchar(64) null, "color" varchar(32) null, "prompt_markdown" text not null, "welcome_message" text null, "conversation_starters" jsonb null, "provider_handle" varchar(64) null, "model_handle" varchar(64) null, "allowed_entity_handles" jsonb null, "allowed_knowledge_entity_handles" jsonb null, "allowed_internal_tools" jsonb null, "allowed_external_tools" jsonb null, "mutation_mode" varchar(16) not null default 'confirm', "is_active" boolean not null default true, "is_default" boolean not null default false, "sort_order" int not null default 100, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "ai_agent_item_pkey" primary key ("handle"));`,
    );
    this.addSql(
      `alter table "ai_agent_item" add constraint "ai_agent_item_provider_handle_foreign" foreign key ("provider_handle") references "ai_provider_type_item" ("handle") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "ai_agent_item" add constraint "ai_agent_item_model_handle_foreign" foreign key ("model_handle") references "ai_provider_model_item" ("handle") on update cascade on delete set null;`,
    );

    this.addSql(
      `create table "ai_agent_item_roles" ("ai_agent_item_handle" varchar(64) not null, "role_item_handle" int not null, constraint "ai_agent_item_roles_pkey" primary key ("ai_agent_item_handle", "role_item_handle"));`,
    );
    this.addSql(
      `alter table "ai_agent_item_roles" add constraint "ai_agent_item_roles_ai_agent_item_handle_foreign" foreign key ("ai_agent_item_handle") references "ai_agent_item" ("handle") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "ai_agent_item_roles" add constraint "ai_agent_item_roles_role_item_handle_foreign" foreign key ("role_item_handle") references "role_item" ("handle") on update cascade on delete cascade;`,
    );

    this.addSql(
      `alter table "ai_chat_session_item" add column "agent_handle" varchar(64) null;`,
    );
    this.addSql(
      `alter table "ai_chat_session_item" add constraint "ai_chat_session_item_agent_handle_foreign" foreign key ("agent_handle") references "ai_agent_item" ("handle") on update cascade on delete set null;`,
    );

    this.addSql(
      `create table "ai_chat_tool_action_item" ("handle" serial primary key, "session_handle" int not null, "message_handle" int null, "person_handle" int not null, "agent_handle" varchar(64) null, "server_name" varchar(128) not null, "tool_name" varchar(128) not null, "arguments" jsonb null, "status" varchar(32) not null default 'pending', "result_payload" jsonb null, "error_payload" jsonb null, "expires_at" timestamptz null, "executed_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );
    this.addSql(
      `alter table "ai_chat_tool_action_item" add constraint "ai_chat_tool_action_item_session_handle_foreign" foreign key ("session_handle") references "ai_chat_session_item" ("handle") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "ai_chat_tool_action_item" add constraint "ai_chat_tool_action_item_message_handle_foreign" foreign key ("message_handle") references "ai_chat_message_item" ("handle") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "ai_chat_tool_action_item" add constraint "ai_chat_tool_action_item_person_handle_foreign" foreign key ("person_handle") references "person_item" ("handle") on update cascade;`,
    );
    this.addSql(
      `alter table "ai_chat_tool_action_item" add constraint "ai_chat_tool_action_item_agent_handle_foreign" foreign key ("agent_handle") references "ai_agent_item" ("handle") on update cascade on delete set null;`,
    );
    this.addSql(
      `create index "ai_chat_tool_action_item_session_status_index" on "ai_chat_tool_action_item" ("session_handle", "status");`,
    );

    this.addSql(
      `update "entity_item" set "can_show" = true where "handle" = 'aiChatToolAction';`,
    );
    this.addSql(
      `update "permission_item" set "allow_read" = true, "allow_show" = true where "entity_handle" = 'aiChatToolAction' and "role_handle" in (1, 2, 3);`,
    );
  }

  override down(): void {
    this.addSql(`drop table if exists "ai_chat_tool_action_item" cascade;`);
    this.addSql(
      `alter table "ai_chat_session_item" drop constraint if exists "ai_chat_session_item_agent_handle_foreign";`,
    );
    this.addSql(
      `alter table "ai_chat_session_item" drop column if exists "agent_handle";`,
    );
    this.addSql(`drop table if exists "ai_agent_item_roles" cascade;`);
    this.addSql(`drop table if exists "ai_agent_item" cascade;`);
  }
}
