import { Migration } from '@mikro-orm/migrations';

export class Migration20260610120000 extends Migration {
  override up(): void {
    this.addSql(
      `create table "import_source_item" ("handle" varchar(64) not null, "title" varchar(128) not null, "description" text null, "is_active" boolean not null default true, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "import_source_item_pkey" primary key ("handle"));`,
    );

    this.addSql(
      `create table "import_template_item" ("handle" serial primary key, "title" varchar(128) not null, "description" text null, "source_handle" varchar(64) not null, "target_entity_handle" varchar(64) not null, "is_active" boolean not null default true, "mapping" jsonb not null, "external_key_columns" jsonb null, "generic_reference_mapping" jsonb null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );
    this.addSql(
      `alter table "import_template_item" add constraint "import_template_item_source_handle_foreign" foreign key ("source_handle") references "import_source_item" ("handle") on update cascade;`,
    );
    this.addSql(
      `alter table "import_template_item" add constraint "import_template_item_target_entity_handle_foreign" foreign key ("target_entity_handle") references "entity_item" ("handle") on update cascade;`,
    );
    this.addSql(
      `create unique index "import_template_item_source_entity_title_unique" on "import_template_item" ("source_handle", "target_entity_handle", "title");`,
    );

    this.addSql(
      `create table "import_batch_item" ("handle" serial primary key, "source_handle" varchar(64) null, "target_entity_handle" varchar(64) null, "import_template_handle" int null, "created_by_handle" int not null, "filename" varchar(256) not null, "mimetype" varchar(128) null, "file_size" int null, "status" varchar(32) not null default 'analyzed', "row_count" int null, "ready_count" int not null default 0, "error_count" int not null default 0, "created_count" int not null default 0, "updated_count" int not null default 0, "skipped_count" int not null default 0, "failed_count" int not null default 0, "delimiter" varchar(8) null, "headers" jsonb null, "sample_rows" jsonb null, "mapping" jsonb null, "external_key_columns" jsonb null, "generic_reference_mapping" jsonb null, "executed_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );
    this.addSql(
      `alter table "import_batch_item" add constraint "import_batch_item_source_handle_foreign" foreign key ("source_handle") references "import_source_item" ("handle") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "import_batch_item" add constraint "import_batch_item_target_entity_handle_foreign" foreign key ("target_entity_handle") references "entity_item" ("handle") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "import_batch_item" add constraint "import_batch_item_import_template_handle_foreign" foreign key ("import_template_handle") references "import_template_item" ("handle") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "import_batch_item" add constraint "import_batch_item_created_by_handle_foreign" foreign key ("created_by_handle") references "person_item" ("handle") on update cascade;`,
    );

    this.addSql(
      `create table "import_batch_row_item" ("handle" serial primary key, "batch_handle" int not null, "row_number" int not null, "status" varchar(32) not null default 'pending', "action" varchar(32) null, "target_reference" varchar(64) null, "external_key_hash" varchar(128) null, "external_key_parts" jsonb null, "raw_data" jsonb not null, "payload" jsonb null, "message" text null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );
    this.addSql(
      `alter table "import_batch_row_item" add constraint "import_batch_row_item_batch_handle_foreign" foreign key ("batch_handle") references "import_batch_item" ("handle") on update cascade on delete cascade;`,
    );
    this.addSql(
      `create index "import_batch_row_item_batch_handle_index" on "import_batch_row_item" ("batch_handle");`,
    );

    this.addSql(
      `create table "external_record_link_item" ("handle" serial primary key, "source_handle" varchar(64) not null, "entity_handle" varchar(64) not null, "reference" varchar(64) not null, "external_key_hash" varchar(128) not null, "external_key_parts" jsonb not null, "first_import_batch_handle" int null, "last_import_batch_handle" int null, "last_seen_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );
    this.addSql(
      `alter table "external_record_link_item" add constraint "external_record_link_item_source_handle_foreign" foreign key ("source_handle") references "import_source_item" ("handle") on update cascade;`,
    );
    this.addSql(
      `alter table "external_record_link_item" add constraint "external_record_link_item_entity_handle_foreign" foreign key ("entity_handle") references "entity_item" ("handle") on update cascade;`,
    );
    this.addSql(
      `alter table "external_record_link_item" add constraint "external_record_link_item_first_import_batch_handle_foreign" foreign key ("first_import_batch_handle") references "import_batch_item" ("handle") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "external_record_link_item" add constraint "external_record_link_item_last_import_batch_handle_foreign" foreign key ("last_import_batch_handle") references "import_batch_item" ("handle") on update cascade on delete set null;`,
    );
    this.addSql(
      `create unique index "external_record_link_item_source_entity_hash_unique" on "external_record_link_item" ("source_handle", "entity_handle", "external_key_hash");`,
    );
    this.addSql(
      `create index "external_record_link_item_entity_reference_index" on "external_record_link_item" ("entity_handle", "reference");`,
    );
  }

  override down(): void {
    this.addSql(`drop table if exists "external_record_link_item" cascade;`);
    this.addSql(`drop table if exists "import_batch_row_item" cascade;`);
    this.addSql(`drop table if exists "import_batch_item" cascade;`);
    this.addSql(`drop table if exists "import_template_item" cascade;`);
    this.addSql(`drop table if exists "import_source_item" cascade;`);
  }
}
