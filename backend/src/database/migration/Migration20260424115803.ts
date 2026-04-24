import { Migration } from '@mikro-orm/migrations';

export class Migration20260424115803 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `alter table "webhook_authentication_oauth2item" alter column "cached_token" type varchar(2048) using ("cached_token"::varchar(2048));`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table "webhook_authentication_oauth2item" alter column "cached_token" type varchar(256) using ("cached_token"::varchar(256));`,
    );
  }
}
