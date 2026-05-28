import { Migration } from '@mikro-orm/migrations';

export class Migration20260528160000 extends Migration {
  override up(): void {
    this.addSql(
      `create table "ai_entity_generation_template_item" ("handle" varchar(64) not null, "title" varchar(128) not null, "action_name" varchar(128) not null, "source_entity_handle" varchar(64) not null, "target_entity_handle" varchar(64) not null, "source_relations" jsonb null, "prompt_markdown" text not null, "field_mapping" jsonb null, "target_defaults" jsonb null, "source_reference_field" varchar(128) null, "user_reference_field" varchar(128) null, "provider_handle" varchar(64) null, "model_handle" varchar(64) null, "is_active" boolean not null default true, "sort_order" int not null default 100, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("handle"));`,
    );
    this.addSql(
      `create index "ai_entity_generation_template_source_action_idx" on "ai_entity_generation_template_item" ("source_entity_handle", "action_name", "is_active");`,
    );
    this.addSql(
      `alter table "ai_entity_generation_template_item" add constraint "ai_entity_generation_template_item_source_entity_handle_foreign" foreign key ("source_entity_handle") references "entity_item" ("handle");`,
    );
    this.addSql(
      `alter table "ai_entity_generation_template_item" add constraint "ai_entity_generation_template_item_target_entity_handle_foreign" foreign key ("target_entity_handle") references "entity_item" ("handle");`,
    );
    this.addSql(
      `alter table "ai_entity_generation_template_item" add constraint "ai_entity_generation_template_item_provider_handle_foreign" foreign key ("provider_handle") references "ai_provider_type_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "ai_entity_generation_template_item" add constraint "ai_entity_generation_template_item_model_handle_foreign" foreign key ("model_handle") references "ai_provider_model_item" ("handle") on delete set null;`,
    );
  }

  override down(): void {
    this.addSql(
      `drop table if exists "ai_entity_generation_template_item" cascade;`,
    );
  }
}
