import { Migration } from '@mikro-orm/migrations';

export class Migration20260424103000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'create table "ticket_search_document_item" ("handle" serial primary key, "ticket_handle" int not null, "search_text" text not null, "problem_text" text null, "solution_text" text null, "content_hash" varchar(128) not null, "embedding_model" varchar(128) null, "embedding_version" int not null default 1, "embedding" jsonb null, "source_updated_at" timestamptz null, "last_indexed_at" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null);',
    );
    this.addSql(
      'alter table "ticket_search_document_item" add constraint "ticket_search_document_item_ticket_handle_unique" unique ("ticket_handle");',
    );
    this.addSql(
      'create index "ticket_search_document_item_last_indexed_at_index" on "ticket_search_document_item" ("last_indexed_at");',
    );
    this.addSql(
      'alter table "ticket_search_document_item" add constraint "ticket_search_document_item_ticket_handle_foreign" foreign key ("ticket_handle") references "ticket_item" ("handle") on delete cascade;',
    );
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists "ticket_search_document_item" cascade;');
  }
}