import { Migration } from '@mikro-orm/migrations';

export class Migration20260509120000 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `alter table "event_type_item" add column "show_in_default_calendar" boolean not null default true;`,
    );

    this.addSql(
      `update "event_type_item" set "show_in_default_calendar" = false where "handle" in ('call', 'mail');`,
    );

    this.addSql(
      `alter table "event_item" alter column "description" type text using ("description"::text);`,
    );

    this.addSql(
      `alter table "information_item" alter column "content" type text using ("content"::text);`,
    );

    this.addSql(
      `alter table "phone_call_item" alter column "note" type text using ("note"::text);`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table "phone_call_item" alter column "note" type varchar(2048) using ("note"::varchar(2048));`,
    );

    this.addSql(
      `alter table "information_item" alter column "content" type varchar(2048) using ("content"::varchar(2048));`,
    );

    this.addSql(
      `alter table "event_item" alter column "description" type varchar(1024) using ("description"::varchar(1024));`,
    );

    this.addSql(
      `alter table "event_type_item" drop column "show_in_default_calendar";`,
    );
  }
}
