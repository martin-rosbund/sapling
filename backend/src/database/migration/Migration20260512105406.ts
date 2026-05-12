import { Migration } from '@mikro-orm/migrations';

export class Migration20260512105406 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `create table "change_log_item" ("handle" serial primary key, "action" varchar(16) not null, "reference" varchar(64) not null, "entity_handle" varchar(64) not null, "person_handle" int not null, "old_payload" jsonb null, "new_payload" jsonb null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );

    this.addSql(
      `create table "change_log_detail_item" ("handle" serial primary key, "log_handle" int not null, "property" varchar(256) not null, "old_value" jsonb null, "new_value" jsonb null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );

    this.addSql(
      `alter table "change_log_item" add constraint "change_log_item_entity_handle_foreign" foreign key ("entity_handle") references "entity_item" ("handle");`,
    );
    this.addSql(
      `alter table "change_log_item" add constraint "change_log_item_person_handle_foreign" foreign key ("person_handle") references "person_item" ("handle");`,
    );

    this.addSql(
      `alter table "change_log_detail_item" add constraint "change_log_detail_item_log_handle_foreign" foreign key ("log_handle") references "change_log_item" ("handle");`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table "change_log_detail_item" drop constraint "change_log_detail_item_log_handle_foreign";`,
    );

    this.addSql(`drop table if exists "change_log_item" cascade;`);
    this.addSql(`drop table if exists "change_log_detail_item" cascade;`);
  }
}
