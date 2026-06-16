import { Migration } from '@mikro-orm/migrations';

export class Migration20260616123000 extends Migration {
  override up(): void {
    this.addSql(
      `alter table "ticket_status_item" add column "is_open" boolean not null default true;`,
    );
    this.addSql(
      `update "ticket_status_item" set "is_open" = false where "handle" in ('closed');`,
    );

    this.addSql(
      `alter table "sales_opportunity_result_status_item" add column "is_open" boolean not null default true;`,
    );
    this.addSql(
      `update "sales_opportunity_result_status_item" set "is_open" = false where "handle" in ('won', 'lost');`,
    );
  }

  override down(): void {
    this.addSql(
      `alter table "sales_opportunity_result_status_item" drop column if exists "is_open";`,
    );
    this.addSql(
      `alter table "ticket_status_item" drop column if exists "is_open";`,
    );
  }
}
