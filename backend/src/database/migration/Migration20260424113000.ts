import { Migration } from '@mikro-orm/migrations';

export class Migration20260424113000 extends Migration {
  override async up(): Promise<void> {
    await this.execute(
      'alter table "webhook_authentication_oauth2item" add column "parameters" jsonb null;',
    );
  }

  override async down(): Promise<void> {
    await this.execute(
      'alter table "webhook_authentication_oauth2item" drop column "parameters";',
    );
  }
}
