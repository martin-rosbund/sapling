import { Migration } from '@mikro-orm/migrations';

export class Migration20260523110000 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `create table "sapling_form_config_item" ("handle" serial primary key, "name" varchar(128) not null, "entity_handle" varchar(64) not null, "scope" varchar(16) not null default 'global', "scope_handle" varchar(64) null, "is_active" boolean not null default true, "is_default" boolean not null default false, "version" int not null default 1, "config" jsonb not null, "person_handle" int null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );

    this.addSql(
      `alter table "sapling_form_config_item" add constraint "sapling_form_config_item_entity_handle_foreign" foreign key ("entity_handle") references "entity_item" ("handle") on update cascade;`,
    );

    this.addSql(
      `alter table "sapling_form_config_item" add constraint "sapling_form_config_item_person_handle_foreign" foreign key ("person_handle") references "person_item" ("handle") on update cascade on delete set null;`,
    );

    this.addSql(
      `create index "sapling_form_config_item_entity_scope_index" on "sapling_form_config_item" ("entity_handle", "scope", "scope_handle");`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "sapling_form_config_item" cascade;`);
  }
}
