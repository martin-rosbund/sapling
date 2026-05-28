import { Migration } from '@mikro-orm/migrations';

export class Migration20260528170000 extends Migration {
  override up(): void {
    this.addSql(
      `alter table "knowledge_article_item" add column "product_handle" int null;`,
    );
    this.addSql(
      `alter table "knowledge_article_item" add constraint "knowledge_article_item_product_handle_foreign" foreign key ("product_handle") references "product_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "ai_entity_generation_template_item" add column "source_field_mapping" jsonb null;`,
    );
    this.addSql(
      `update "ai_entity_generation_template_item" set "source_relations" = '["status","priority","type","category","creatorCompany","creatorPerson","assigneeCompany","assigneePerson","contract","contract.products","salesOpportunity","effortEstimates"]'::jsonb, "source_field_mapping" = '{"contract.products.0":"product"}'::jsonb where "handle" = 'ticketKnowledgeArticle';`,
    );
  }

  override down(): void {
    this.addSql(
      `update "ai_entity_generation_template_item" set "source_relations" = '["status","priority","type","category","creatorCompany","creatorPerson","assigneeCompany","assigneePerson","salesOpportunity","effortEstimates"]'::jsonb where "handle" = 'ticketKnowledgeArticle';`,
    );
    this.addSql(
      `alter table "knowledge_article_item" drop constraint if exists "knowledge_article_item_product_handle_foreign";`,
    );
    this.addSql(
      `alter table "knowledge_article_item" drop column if exists "product_handle";`,
    );
    this.addSql(
      `alter table "ai_entity_generation_template_item" drop column if exists "source_field_mapping";`,
    );
  }
}
