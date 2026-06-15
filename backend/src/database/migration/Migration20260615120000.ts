import { Migration } from '@mikro-orm/migrations';

export class Migration20260615120000 extends Migration {
  override up(): void {
    this.addSql(
      `alter table "import_batch_item" add column "current_operation" varchar(32) null;`,
    );
    this.addSql(
      `alter table "import_batch_item" add column "processed_count" int not null default 0;`,
    );
    this.addSql(
      `alter table "import_batch_item" add column "job_id" varchar(128) null;`,
    );
    this.addSql(
      `alter table "import_batch_item" add column "started_at" timestamptz null;`,
    );
    this.addSql(
      `alter table "import_batch_item" add column "completed_at" timestamptz null;`,
    );
    this.addSql(
      `alter table "import_batch_item" add column "failed_at" timestamptz null;`,
    );
    this.addSql(
      `alter table "import_batch_item" add column "last_error" text null;`,
    );
  }

  override down(): void {
    this.addSql(
      `alter table "import_batch_item" drop column if exists "current_operation";`,
    );
    this.addSql(
      `alter table "import_batch_item" drop column if exists "processed_count";`,
    );
    this.addSql(
      `alter table "import_batch_item" drop column if exists "job_id";`,
    );
    this.addSql(
      `alter table "import_batch_item" drop column if exists "started_at";`,
    );
    this.addSql(
      `alter table "import_batch_item" drop column if exists "completed_at";`,
    );
    this.addSql(
      `alter table "import_batch_item" drop column if exists "failed_at";`,
    );
    this.addSql(
      `alter table "import_batch_item" drop column if exists "last_error";`,
    );
  }
}
