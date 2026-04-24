import { Migration } from '@mikro-orm/migrations';

export class Migration20260423203000 extends Migration {
  override up(): void {
    this.addSql(
      'alter table "webhook_subscription_item" add column "relations" jsonb null;',
    );
  }

  override down(): void {
    this.addSql(
      'alter table "webhook_subscription_item" drop column "relations";',
    );
  }
}
