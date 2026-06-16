import { Migration } from '@mikro-orm/migrations';

export class Migration20260616120000 extends Migration {
  override up(): void {
    this.addSql(
      `alter table "event_status_item" add column "is_open" boolean not null default true;`,
    );
    this.addSql(
      `update "event_status_item" set "is_open" = false where "handle" in ('canceled', 'completed');`,
    );
  }

  override down(): void {
    this.addSql(
      `alter table "event_status_item" drop column if exists "is_open";`,
    );
  }
}
