import { Migration } from '@mikro-orm/migrations';

export class Migration20260423110000 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `create table "session_store_item" ("handle" varchar(255) not null, "payload" jsonb not null, "expires_at" timestamptz not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("handle"));`,
    );
    this.addSql(
      `create index "session_store_item_expires_at_index" on "session_store_item" ("expires_at");`,
    );
  }
}
