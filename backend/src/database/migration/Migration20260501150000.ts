import { Migration } from '@mikro-orm/migrations';

export class Migration20260501150000 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `create table "shared_mailbox_group_item" ("handle" serial primary key, "title" varchar(128) not null, "description" varchar(256) null, "icon" varchar(64) not null default 'mdi-email-lock-outline', "color" varchar(32) not null default '#1565C0', "is_active" boolean not null default true, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );
    this.addSql(
      `create table "shared_mailbox_item" ("handle" serial primary key, "title" varchar(128) not null, "email" varchar(256) not null, "description" varchar(256) null, "provider_handle" varchar(64) not null default 'azure', "is_active" boolean not null default true, "group_handle" int null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );
    this.addSql(
      `create table "shared_mailbox_group_item_persons" ("shared_mailbox_group_item_handle" int not null, "person_item_handle" int not null, primary key ("shared_mailbox_group_item_handle", "person_item_handle"));`,
    );

    this.addSql(
      `alter table "shared_mailbox_item" add constraint "shared_mailbox_item_group_handle_foreign" foreign key ("group_handle") references "shared_mailbox_group_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "shared_mailbox_item" add constraint "shared_mailbox_item_provider_handle_foreign" foreign key ("provider_handle") references "person_type_item" ("handle");`,
    );
    this.addSql(
      `alter table "shared_mailbox_group_item_persons" add constraint "shared_mailbox_group_item_persons_shared_mailbox_group_item_handle_foreign" foreign key ("shared_mailbox_group_item_handle") references "shared_mailbox_group_item" ("handle") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "shared_mailbox_group_item_persons" add constraint "shared_mailbox_group_item_persons_person_item_handle_foreign" foreign key ("person_item_handle") references "person_item" ("handle") on update cascade on delete cascade;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table "shared_mailbox_group_item_persons" drop constraint "shared_mailbox_group_item_persons_person_item_handle_foreign";`,
    );
    this.addSql(
      `alter table "shared_mailbox_group_item_persons" drop constraint "shared_mailbox_group_item_persons_shared_mailbox_group_item_handle_foreign";`,
    );
    this.addSql(
      `alter table "shared_mailbox_item" drop constraint "shared_mailbox_item_provider_handle_foreign";`,
    );
    this.addSql(
      `alter table "shared_mailbox_item" drop constraint "shared_mailbox_item_group_handle_foreign";`,
    );

    this.addSql(
      `drop table if exists "shared_mailbox_group_item_persons" cascade;`,
    );
    this.addSql(`drop table if exists "shared_mailbox_item" cascade;`);
    this.addSql(`drop table if exists "shared_mailbox_group_item" cascade;`);
  }
}
