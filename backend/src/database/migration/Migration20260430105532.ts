import { Migration } from '@mikro-orm/migrations';

export class Migration20260430105532 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `create table "dashboard_template_item" ("handle" serial primary key, "name" varchar(128) not null, "description" varchar(512) null, "is_shared" boolean not null default false, "person_handle" int not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );

    this.addSql(
      `create table "dashboard_template_item_kpis" ("dashboard_template_item_handle" int not null, "kpi_item_handle" int not null, primary key ("dashboard_template_item_handle", "kpi_item_handle"));`,
    );

    this.addSql(
      `alter table "dashboard_template_item" add constraint "dashboard_template_item_person_handle_foreign" foreign key ("person_handle") references "person_item" ("handle");`,
    );

    this.addSql(
      `alter table "dashboard_template_item_kpis" add constraint "dashboard_template_item_kpis_dashboard_template__45778_foreign" foreign key ("dashboard_template_item_handle") references "dashboard_template_item" ("handle") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "dashboard_template_item_kpis" add constraint "dashboard_template_item_kpis_kpi_item_handle_foreign" foreign key ("kpi_item_handle") references "kpi_item" ("handle") on update cascade on delete cascade;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table "dashboard_template_item_kpis" drop constraint "dashboard_template_item_kpis_dashboard_template__45778_foreign";`,
    );

    this.addSql(`drop table if exists "dashboard_template_item" cascade;`);
    this.addSql(`drop table if exists "dashboard_template_item_kpis" cascade;`);
  }
}
