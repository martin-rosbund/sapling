import { Migration } from '@mikro-orm/migrations';

export class Migration20260424121000 extends Migration {
  override up(): void {
    this.addSql(
      'alter table "ticket_search_document_item" add column "ticket_number" varchar(32) null, add column "external_number" varchar(128) null, add column "title" varchar(128) null;',
    );
    this.addSql(
      'create index "ticket_search_document_item_ticket_number_index" on "ticket_search_document_item" ("ticket_number");',
    );
    this.addSql(
      'create index "ticket_search_document_item_external_number_index" on "ticket_search_document_item" ("external_number");',
    );
    this.addSql(
      'create index "ticket_search_document_item_title_index" on "ticket_search_document_item" ("title");',
    );
  }

  override down(): void {
    this.addSql(
      'drop index if exists "ticket_search_document_item_ticket_number_index";',
    );
    this.addSql(
      'drop index if exists "ticket_search_document_item_external_number_index";',
    );
    this.addSql(
      'drop index if exists "ticket_search_document_item_title_index";',
    );
    this.addSql(
      'alter table "ticket_search_document_item" drop column "ticket_number", drop column "external_number", drop column "title";',
    );
  }
}
