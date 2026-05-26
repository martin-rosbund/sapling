import { Migration } from '@mikro-orm/migrations';

export class Migration20260526113000 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `alter table "sales_opportunity_item" alter column "description" type text using "description"::text;`,
    );
    this.addSql(
      `alter table "sales_opportunity_item" alter column "pain_points" type text using "pain_points"::text;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table "sales_opportunity_item" alter column "description" type varchar(1024) using left("description"::text, 1024);`,
    );
    this.addSql(
      `alter table "sales_opportunity_item" alter column "pain_points" type varchar(512) using left("pain_points"::text, 512);`,
    );
  }
}
