import { Migration } from '@mikro-orm/migrations';

export class Migration20260501121000 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `create table "holiday_group_item" ("handle" serial primary key, "title" varchar(128) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );

    this.addSql(
      `create table "holiday_item" ("handle" serial primary key, "title" varchar(128) not null, "description" varchar(1024) null, "group_handle" int not null, "start_date" timestamptz not null, "end_date" timestamptz not null, "is_all_day" boolean not null default true, "icon" varchar(64) not null default 'mdi-calendar-alert', "color" varchar(32) not null default '#C62828', "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );

    this.addSql(
      `alter table "holiday_item" add constraint "holiday_item_group_handle_foreign" foreign key ("group_handle") references "holiday_group_item" ("handle");`,
    );
    this.addSql(
      `alter table "company_item" add column "holiday_group_handle" int null;`,
    );
    this.addSql(
      `alter table "company_item" add constraint "company_item_holiday_group_handle_foreign" foreign key ("holiday_group_handle") references "holiday_group_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "person_item" add column "holiday_group_handle" int null;`,
    );
    this.addSql(
      `alter table "person_item" add constraint "person_item_holiday_group_handle_foreign" foreign key ("holiday_group_handle") references "holiday_group_item" ("handle") on delete set null;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table "person_item" drop constraint "person_item_holiday_group_handle_foreign";`,
    );
    this.addSql(
      `alter table "company_item" drop constraint "company_item_holiday_group_handle_foreign";`,
    );
    this.addSql(
      `alter table "holiday_item" drop constraint "holiday_item_group_handle_foreign";`,
    );
    this.addSql(
      `alter table "person_item" drop column "holiday_group_handle";`,
    );
    this.addSql(
      `alter table "company_item" drop column "holiday_group_handle";`,
    );
    this.addSql(`drop table if exists "holiday_item" cascade;`);
    this.addSql(`drop table if exists "holiday_group_item" cascade;`);
  }
}
