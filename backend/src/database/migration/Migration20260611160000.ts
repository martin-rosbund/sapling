import { Migration } from '@mikro-orm/migrations';

export class Migration20260611160000 extends Migration {
  override up(): void {
    this.addSql(
      `create table "custom_field_type_item" ("handle" varchar(64) not null, "title" varchar(128) not null, "icon" varchar(64) not null default 'mdi-form-textbox', "color" varchar(32) not null default '#546E7A', "sort_order" int not null default 0, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "custom_field_type_item_pkey" primary key ("handle"));`,
    );

    this.addSql(
      `create table "custom_field_definition_item" ("handle" serial primary key, "entity_handle" varchar(64) not null, "field_key" varchar(96) not null, "label" varchar(128) not null, "field_type_handle" varchar(64) not null, "is_required" boolean not null default false, "is_active" boolean not null default true, "field_order" int not null default 0, "form_visible" boolean not null default true, "table_visible" boolean not null default false, "mobile_visible" boolean not null default false, "select_options" jsonb null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );
    this.addSql(
      `alter table "custom_field_definition_item" add constraint "custom_field_definition_item_entity_handle_foreign" foreign key ("entity_handle") references "entity_item" ("handle") on update cascade;`,
    );
    this.addSql(
      `alter table "custom_field_definition_item" add constraint "custom_field_definition_item_field_type_handle_foreign" foreign key ("field_type_handle") references "custom_field_type_item" ("handle") on update cascade;`,
    );
    this.addSql(
      `create unique index "custom_field_definition_item_entity_field_key_unique" on "custom_field_definition_item" ("entity_handle", "field_key");`,
    );

    this.addSql(
      `create table "custom_field_value_item" ("handle" serial primary key, "entity_handle" varchar(64) not null, "definition_handle" int not null, "record_reference" varchar(64) not null, "value_string" text null, "value_number" double precision null, "value_boolean" boolean null, "value_date" date null, "value_date_time" timestamptz null, "value_json" jsonb null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );
    this.addSql(
      `alter table "custom_field_value_item" add constraint "custom_field_value_item_entity_handle_foreign" foreign key ("entity_handle") references "entity_item" ("handle") on update cascade;`,
    );
    this.addSql(
      `alter table "custom_field_value_item" add constraint "custom_field_value_item_definition_handle_foreign" foreign key ("definition_handle") references "custom_field_definition_item" ("handle") on update cascade on delete cascade;`,
    );
    this.addSql(
      `create unique index "custom_field_value_item_entity_record_definition_unique" on "custom_field_value_item" ("entity_handle", "record_reference", "definition_handle");`,
    );
    this.addSql(
      `create index "custom_field_value_item_definition_value_string_index" on "custom_field_value_item" ("definition_handle", "value_string");`,
    );
    this.addSql(
      `create index "custom_field_value_item_definition_value_number_index" on "custom_field_value_item" ("definition_handle", "value_number");`,
    );
    this.addSql(
      `create index "custom_field_value_item_definition_value_boolean_index" on "custom_field_value_item" ("definition_handle", "value_boolean");`,
    );
    this.addSql(
      `create index "custom_field_value_item_definition_value_date_index" on "custom_field_value_item" ("definition_handle", "value_date");`,
    );
    this.addSql(
      `create index "custom_field_value_item_definition_value_date_time_index" on "custom_field_value_item" ("definition_handle", "value_date_time");`,
    );
  }

  override down(): void {
    this.addSql(`drop table if exists "custom_field_value_item" cascade;`);
    this.addSql(`drop table if exists "custom_field_definition_item" cascade;`);
    this.addSql(`drop table if exists "custom_field_type_item" cascade;`);
  }
}
