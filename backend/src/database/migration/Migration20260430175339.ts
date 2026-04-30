import { Migration } from '@mikro-orm/migrations';

export class Migration20260430175339 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `alter table "event_item" add "recurrence_rule" varchar(512) null;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "event_item" drop column "recurrence_rule";`);
  }
}
