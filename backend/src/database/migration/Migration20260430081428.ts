import { Migration } from '@mikro-orm/migrations';

export class Migration20260430081428 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `create table "teams_delivery_status_item" ("handle" varchar(64) not null, "description" varchar(64) not null, "icon" varchar(64) not null default 'mdi-microsoft-teams', "color" varchar(32) not null default '#4CAF50', "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("handle"));`,
    );

    this.addSql(
      `create table "teams_template_item" ("handle" serial primary key, "name" varchar(128) not null, "description" varchar(256) null, "body_markdown" varchar(8192) not null, "is_default" boolean not null default false, "is_active" boolean not null default true, "entity_handle" varchar(64) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );

    this.addSql(
      `create table "teams_subscription_item" ("handle" serial primary key, "description" varchar(128) not null, "recipient_field" varchar(64) not null, "is_active" boolean not null default true, "entity_handle" varchar(64) not null, "type_handle" varchar(64) not null default 'afterInsert', "template_handle" int not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );

    this.addSql(
      `create table "teams_delivery_item" ("handle" serial primary key, "status_handle" varchar(64) null default 'pending', "subscription_handle" int not null, "template_handle" int null, "entity_handle" varchar(64) not null, "created_by_handle" int not null, "recipient_person_handle" int null, "reference_handle" varchar(64) null, "provider" varchar(32) not null default 'azure', "body_markdown" varchar(8192) not null, "body_html" varchar(16384) not null, "request_payload" jsonb null, "response_status_code" int null, "response_body" jsonb null, "provider_message_id" varchar(256) null, "completed_at" timestamptz null, "attempt_count" int not null default 0, "next_retry_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );

    this.addSql(
      `alter table "teams_template_item" add constraint "teams_template_item_entity_handle_foreign" foreign key ("entity_handle") references "entity_item" ("handle");`,
    );

    this.addSql(
      `alter table "teams_subscription_item" add constraint "teams_subscription_item_entity_handle_foreign" foreign key ("entity_handle") references "entity_item" ("handle");`,
    );
    this.addSql(
      `alter table "teams_subscription_item" add constraint "teams_subscription_item_type_handle_foreign" foreign key ("type_handle") references "webhook_subscription_type_item" ("handle");`,
    );
    this.addSql(
      `alter table "teams_subscription_item" add constraint "teams_subscription_item_template_handle_foreign" foreign key ("template_handle") references "teams_template_item" ("handle");`,
    );

    this.addSql(
      `alter table "teams_delivery_item" add constraint "teams_delivery_item_status_handle_foreign" foreign key ("status_handle") references "teams_delivery_status_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "teams_delivery_item" add constraint "teams_delivery_item_subscription_handle_foreign" foreign key ("subscription_handle") references "teams_subscription_item" ("handle");`,
    );
    this.addSql(
      `alter table "teams_delivery_item" add constraint "teams_delivery_item_template_handle_foreign" foreign key ("template_handle") references "teams_template_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "teams_delivery_item" add constraint "teams_delivery_item_entity_handle_foreign" foreign key ("entity_handle") references "entity_item" ("handle");`,
    );
    this.addSql(
      `alter table "teams_delivery_item" add constraint "teams_delivery_item_created_by_handle_foreign" foreign key ("created_by_handle") references "person_item" ("handle");`,
    );
    this.addSql(
      `alter table "teams_delivery_item" add constraint "teams_delivery_item_recipient_person_handle_foreign" foreign key ("recipient_person_handle") references "person_item" ("handle") on delete set null;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table "teams_delivery_item" drop constraint "teams_delivery_item_status_handle_foreign";`,
    );
    this.addSql(
      `alter table "teams_subscription_item" drop constraint "teams_subscription_item_template_handle_foreign";`,
    );
    this.addSql(
      `alter table "teams_delivery_item" drop constraint "teams_delivery_item_template_handle_foreign";`,
    );
    this.addSql(
      `alter table "teams_delivery_item" drop constraint "teams_delivery_item_subscription_handle_foreign";`,
    );

    this.addSql(`drop table if exists "teams_delivery_status_item" cascade;`);
    this.addSql(`drop table if exists "teams_template_item" cascade;`);
    this.addSql(`drop table if exists "teams_subscription_item" cascade;`);
    this.addSql(`drop table if exists "teams_delivery_item" cascade;`);
  }
}
