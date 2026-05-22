import { Migration } from '@mikro-orm/migrations';

export class Migration20260522163000 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `alter table "ticket_item" alter column "problem_description" type text using ("problem_description"::text);`,
    );

    this.addSql(
      `alter table "ticket_item" alter column "solution_description" type text using ("solution_description"::text);`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table "ticket_item" alter column "solution_description" type varchar(1024) using (left("solution_description", 1024)::varchar(1024));`,
    );

    this.addSql(
      `alter table "ticket_item" alter column "problem_description" type varchar(1024) using (left("problem_description", 1024)::varchar(1024));`,
    );
  }
}
