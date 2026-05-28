import { Migration } from '@mikro-orm/migrations';

export class Migration20260528143000 extends Migration {
  override up(): void {
    this.addSql(
      `create table "knowledge_article_status_item" ("handle" varchar(64) not null, "description" varchar(64) not null, "color" varchar(32) not null, "icon" varchar(64) not null default 'mdi-file-document-outline', "sort_order" int not null default 100, "is_published" boolean not null default false, "is_archived" boolean not null default false, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("handle"));`,
    );
    this.addSql(
      `create table "knowledge_article_visibility_item" ("handle" varchar(64) not null, "description" varchar(64) not null, "color" varchar(32) not null, "icon" varchar(64) not null default 'mdi-eye-outline', "sort_order" int not null default 100, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("handle"));`,
    );
    this.addSql(
      `create table "knowledge_article_category_item" ("handle" varchar(64) not null, "title" varchar(128) not null, "description" varchar(256) null, "icon" varchar(64) not null default 'mdi-shape-outline', "color" varchar(32) not null default '#607D8B', "sort_order" int not null default 100, "is_active" boolean not null default true, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("handle"));`,
    );
    this.addSql(
      `create table "knowledge_article_item" ("handle" serial primary key, "title" varchar(160) not null, "status_handle" varchar(64) not null default 'draft', "visibility_handle" varchar(64) not null default 'internal', "category_handle" varchar(64) null, "summary" text null, "tags" varchar(512) null, "problem_markdown" text null, "solution_markdown" text null, "is_active" boolean not null default true, "published_at" timestamptz null, "valid_until" date null, "source_ticket_handle" int null, "source_sales_opportunity_handle" int null, "source_effort_estimate_handle" int null, "author_person_handle" int null, "reviewer_person_handle" int null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );
    this.addSql(
      `alter table "knowledge_article_item" add constraint "knowledge_article_item_status_handle_foreign" foreign key ("status_handle") references "knowledge_article_status_item" ("handle");`,
    );
    this.addSql(
      `alter table "knowledge_article_item" add constraint "knowledge_article_item_visibility_handle_foreign" foreign key ("visibility_handle") references "knowledge_article_visibility_item" ("handle");`,
    );
    this.addSql(
      `alter table "knowledge_article_item" add constraint "knowledge_article_item_category_handle_foreign" foreign key ("category_handle") references "knowledge_article_category_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "knowledge_article_item" add constraint "knowledge_article_item_source_ticket_handle_foreign" foreign key ("source_ticket_handle") references "ticket_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "knowledge_article_item" add constraint "knowledge_article_item_source_sales_opportunity_handle_foreign" foreign key ("source_sales_opportunity_handle") references "sales_opportunity_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "knowledge_article_item" add constraint "knowledge_article_item_source_effort_estimate_handle_foreign" foreign key ("source_effort_estimate_handle") references "effort_estimate_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "knowledge_article_item" add constraint "knowledge_article_item_author_person_handle_foreign" foreign key ("author_person_handle") references "person_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "knowledge_article_item" add constraint "knowledge_article_item_reviewer_person_handle_foreign" foreign key ("reviewer_person_handle") references "person_item" ("handle") on delete set null;`,
    );
  }

  override down(): void {
    this.addSql(`drop table if exists "knowledge_article_item" cascade;`);
    this.addSql(
      `drop table if exists "knowledge_article_category_item" cascade;`,
    );
    this.addSql(
      `drop table if exists "knowledge_article_visibility_item" cascade;`,
    );
    this.addSql(
      `drop table if exists "knowledge_article_status_item" cascade;`,
    );
  }
}
