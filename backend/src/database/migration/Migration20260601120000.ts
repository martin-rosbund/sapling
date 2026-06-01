import { Migration } from '@mikro-orm/migrations';

export class Migration20260601120000 extends Migration {
  override up(): void {
    this.addSql(
      `create table "calendar_sync_subscription_item" ("handle" serial primary key, "description" varchar(128) not null default 'Outlook calendar import', "provider" varchar(32) not null default 'azure', "is_active" boolean not null default false, "sync_range" varchar(16) not null default 'week', "interval_minutes" int not null default 60, "last_run_at" timestamptz null, "last_success_at" timestamptz null, "last_error" varchar(512) null, "last_imported_count" int not null default 0, "last_created_count" int not null default 0, "last_updated_count" int not null default 0, "last_skipped_count" int not null default 0, "person_handle" int not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );
    this.addSql(
      `alter table "calendar_sync_subscription_item" add constraint "calendar_sync_subscription_item_person_handle_unique" unique ("person_handle");`,
    );
    this.addSql(
      `alter table "calendar_sync_subscription_item" add constraint "calendar_sync_subscription_item_person_handle_foreign" foreign key ("person_handle") references "person_item" ("handle") on delete cascade;`,
    );
  }

  override down(): void {
    this.addSql(
      `alter table "calendar_sync_subscription_item" drop constraint if exists "calendar_sync_subscription_item_person_handle_foreign";`,
    );
    this.addSql(
      `drop table if exists "calendar_sync_subscription_item" cascade;`,
    );
  }
}
