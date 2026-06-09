import { Migration } from '@mikro-orm/migrations';

export class Migration20260609130000 extends Migration {
  override up(): void {
    this.addSql(
      `alter table "knowledge_article_item" add column "context_key" varchar(128) null, add column "documentation_markdown" text null;`,
    );
  }

  override down(): void {
    this.addSql(
      `alter table "knowledge_article_item" drop column if exists "context_key", drop column if exists "documentation_markdown";`,
    );
  }
}
