import { Migration } from '@mikro-orm/migrations';

export class Migration20260417120000 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `create table "person_api_token_item" ("handle" serial primary key, "description" varchar(128) not null, "token_prefix" varchar(24) not null, "token_hash" varchar(128) not null, "is_active" boolean not null default true, "expires_at" timestamptz not null, "last_used_at" timestamptz null, "allowed_ips" jsonb null, "person_handle" int not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );
    this.addSql(
      `alter table "person_api_token_item" add constraint "person_api_token_item_token_hash_unique" unique ("token_hash");`,
    );
    this.addSql(
      `alter table "person_api_token_item" add constraint "person_api_token_item_person_handle_foreign" foreign key ("person_handle") references "person_item" ("handle") on update cascade on delete cascade;`,
    );
    this.addSql(
      `create index "person_api_token_item_person_handle_index" on "person_api_token_item" ("person_handle");`,
    );
  }
}
