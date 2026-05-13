import { Migration } from '@mikro-orm/migrations';

export class Migration20260512132442 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `create table "change_log_action_item" ("handle" varchar(32) not null, "title" varchar(128) not null, "description" varchar(256) null, "icon" varchar(64) not null default 'mdi-pencil-circle-outline', "color" varchar(32) not null default '#546E7A', "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("handle"));`,
    );

    this.addSql(
      `create table "inbox_template_item" ("handle" serial primary key, "name" varchar(128) not null, "description" varchar(256) null, "title_template" varchar(256) not null, "body_markdown" varchar(8192) not null, "is_default" boolean not null default false, "is_active" boolean not null default true, "entity_handle" varchar(64) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );

    this.addSql(
      `create table "inbox_subscription_item" ("handle" serial primary key, "description" varchar(128) not null, "recipient_field" varchar(64) not null, "is_active" boolean not null default true, "entity_handle" varchar(64) not null, "type_handle" varchar(64) not null default 'afterInsert', "template_handle" int not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );

    this.addSql(
      `create table "inbox_notification_item" ("handle" serial primary key, "entity_handle" varchar(64) not null, "subscription_handle" int not null, "template_handle" int null, "recipient_person_handle" int not null, "created_by_handle" int not null, "reference_handle" varchar(64) null, "title" varchar(256) not null, "body_markdown" varchar(8192) not null, "body_text" varchar(8192) not null, "request_payload" jsonb null, "is_read" boolean not null default false, "read_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );

    this.addSql(
      `create table "change_log_item" ("handle" serial primary key, "action_handle" varchar(32) not null, "reference" varchar(64) not null, "entity_handle" varchar(64) not null, "person_handle" int not null, "old_payload" jsonb null, "new_payload" jsonb null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );

    this.addSql(
      `create table "change_log_detail_item" ("handle" serial primary key, "log_handle" int not null, "property" varchar(256) not null, "old_value" jsonb null, "new_value" jsonb null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );

    this.addSql(
      `alter table "inbox_template_item" add constraint "inbox_template_item_entity_handle_foreign" foreign key ("entity_handle") references "entity_item" ("handle");`,
    );

    this.addSql(
      `alter table "inbox_subscription_item" add constraint "inbox_subscription_item_entity_handle_foreign" foreign key ("entity_handle") references "entity_item" ("handle");`,
    );
    this.addSql(
      `alter table "inbox_subscription_item" add constraint "inbox_subscription_item_type_handle_foreign" foreign key ("type_handle") references "webhook_subscription_type_item" ("handle");`,
    );
    this.addSql(
      `alter table "inbox_subscription_item" add constraint "inbox_subscription_item_template_handle_foreign" foreign key ("template_handle") references "inbox_template_item" ("handle");`,
    );

    this.addSql(
      `alter table "inbox_notification_item" add constraint "inbox_notification_item_entity_handle_foreign" foreign key ("entity_handle") references "entity_item" ("handle");`,
    );
    this.addSql(
      `alter table "inbox_notification_item" add constraint "inbox_notification_item_subscription_handle_foreign" foreign key ("subscription_handle") references "inbox_subscription_item" ("handle");`,
    );
    this.addSql(
      `alter table "inbox_notification_item" add constraint "inbox_notification_item_template_handle_foreign" foreign key ("template_handle") references "inbox_template_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "inbox_notification_item" add constraint "inbox_notification_item_recipient_person_handle_foreign" foreign key ("recipient_person_handle") references "person_item" ("handle");`,
    );
    this.addSql(
      `alter table "inbox_notification_item" add constraint "inbox_notification_item_created_by_handle_foreign" foreign key ("created_by_handle") references "person_item" ("handle");`,
    );

    this.addSql(
      `alter table "change_log_item" add constraint "change_log_item_action_handle_foreign" foreign key ("action_handle") references "change_log_action_item" ("handle");`,
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
      `alter table "change_log_item" drop constraint "change_log_item_action_handle_foreign";`,
    );
    this.addSql(
      `alter table "inbox_subscription_item" drop constraint "inbox_subscription_item_template_handle_foreign";`,
    );
    this.addSql(
      `alter table "inbox_notification_item" drop constraint "inbox_notification_item_template_handle_foreign";`,
    );
    this.addSql(
      `alter table "inbox_notification_item" drop constraint "inbox_notification_item_subscription_handle_foreign";`,
    );
    this.addSql(
      `alter table "change_log_detail_item" drop constraint "change_log_detail_item_log_handle_foreign";`,
    );

    this.addSql(`drop table if exists "change_log_action_item" cascade;`);
    this.addSql(`drop table if exists "inbox_template_item" cascade;`);
    this.addSql(`drop table if exists "inbox_subscription_item" cascade;`);
    this.addSql(`drop table if exists "inbox_notification_item" cascade;`);
    this.addSql(`drop table if exists "change_log_item" cascade;`);
    this.addSql(`drop table if exists "change_log_detail_item" cascade;`);
  }
}
