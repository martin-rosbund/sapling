import { Migration } from '@mikro-orm/migrations';

export class Migration20260528120000 extends Migration {
  override up(): void {
    this.addSql(
      `create table "person_passkey_item" ("handle" serial primary key, "label" varchar(128) not null, "credential_id" varchar(512) not null, "public_key" text not null, "counter" int not null default 0, "transports" jsonb null, "credential_device_type" varchar(32) null, "credential_backed_up" boolean not null default false, "last_used_at" timestamptz null, "person_handle" int not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );
    this.addSql(
      `alter table "person_passkey_item" add constraint "person_passkey_item_credential_id_unique" unique ("credential_id");`,
    );
    this.addSql(
      `alter table "person_passkey_item" add constraint "person_passkey_item_person_handle_foreign" foreign key ("person_handle") references "person_item" ("handle");`,
    );
  }

  override down(): void {
    this.addSql(
      `alter table "person_passkey_item" drop constraint "person_passkey_item_person_handle_foreign";`,
    );
    this.addSql(`drop table if exists "person_passkey_item" cascade;`);
  }
}
