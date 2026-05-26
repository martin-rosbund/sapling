import { Migration } from '@mikro-orm/migrations';

export class Migration20260526100000 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `create table "effort_estimate_status_item" ("handle" varchar(64) not null, "description" varchar(64) not null, "color" varchar(16) not null, "icon" varchar(64) not null default 'mdi-new-box', "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("handle"));`,
    );

    this.addSql(
      `create table "effort_estimate_position_template_item" ("handle" serial primary key, "title" varchar(128) not null, "description" varchar(256) null, "estimated_hours" real null, "offer_text_markdown" text not null, "is_active" boolean not null default true, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );

    this.addSql(
      `create table "effort_estimate_item" ("handle" serial primary key, "title" varchar(128) not null, "status_handle" varchar(64) not null default 'new', "expected_completion_date" date null, "requirements_markdown" text null, "is_active" boolean not null default true, "assignee_company_handle" int null, "assignee_person_handle" int null, "creator_company_handle" int null, "creator_person_handle" int null, "sales_opportunity_handle" int null, "ticket_handle" int null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );

    this.addSql(
      `create table "effort_estimate_position_item" ("handle" serial primary key, "title" varchar(128) not null, "estimated_hours" real null, "offer_text_markdown" text null, "sort_order" int not null default 100, "is_optional" boolean not null default false, "estimate_handle" int not null, "template_handle" int null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );

    this.addSql(
      `alter table "effort_estimate_item" add constraint "effort_estimate_item_assignee_company_handle_foreign" foreign key ("assignee_company_handle") references "company_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "effort_estimate_item" add constraint "effort_estimate_item_status_handle_foreign" foreign key ("status_handle") references "effort_estimate_status_item" ("handle");`,
    );
    this.addSql(
      `alter table "effort_estimate_item" add constraint "effort_estimate_item_assignee_person_handle_foreign" foreign key ("assignee_person_handle") references "person_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "effort_estimate_item" add constraint "effort_estimate_item_creator_company_handle_foreign" foreign key ("creator_company_handle") references "company_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "effort_estimate_item" add constraint "effort_estimate_item_creator_person_handle_foreign" foreign key ("creator_person_handle") references "person_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "effort_estimate_item" add constraint "effort_estimate_item_sales_opportunity_handle_foreign" foreign key ("sales_opportunity_handle") references "sales_opportunity_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "effort_estimate_item" add constraint "effort_estimate_item_ticket_handle_foreign" foreign key ("ticket_handle") references "ticket_item" ("handle") on delete set null;`,
    );

    this.addSql(
      `alter table "effort_estimate_position_item" add constraint "effort_estimate_position_item_estimate_handle_foreign" foreign key ("estimate_handle") references "effort_estimate_item" ("handle") on delete cascade;`,
    );
    this.addSql(
      `alter table "effort_estimate_position_item" add constraint "effort_estimate_position_item_template_handle_foreign" foreign key ("template_handle") references "effort_estimate_position_template_item" ("handle") on delete set null;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `drop table if exists "effort_estimate_position_item" cascade;`,
    );
    this.addSql(`drop table if exists "effort_estimate_item" cascade;`);
    this.addSql(
      `drop table if exists "effort_estimate_position_template_item" cascade;`,
    );
    this.addSql(`drop table if exists "effort_estimate_status_item" cascade;`);
  }
}
