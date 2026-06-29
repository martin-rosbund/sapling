import { Migration } from '@mikro-orm/migrations';

export class Migration20260629120000 extends Migration {
  override up(): void {
    this.addSql(
      `alter table "event_item" add "is_private" boolean not null default false;`,
    );
  }

  override down(): void {
    this.addSql(`alter table "event_item" drop column "is_private";`);
  }
}
