import { Migration } from '@mikro-orm/migrations';

export class Migration20260426091707 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `create table "email_list_item" ("handle" serial primary key, "title" varchar(128) not null, "mail_template_handle" int null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );

    this.addSql(
      `create table "email_list_item_persons" ("email_list_item_handle" int not null, "person_item_handle" int not null, primary key ("email_list_item_handle", "person_item_handle"));`,
    );

    this.addSql(
      `create table "email_list_item_companies" ("email_list_item_handle" int not null, "company_item_handle" int not null, primary key ("email_list_item_handle", "company_item_handle"));`,
    );

    this.addSql(
      `alter table "email_list_item" add constraint "email_list_item_mail_template_handle_foreign" foreign key ("mail_template_handle") references "email_template_item" ("handle") on delete set null;`,
    );

    this.addSql(
      `alter table "email_list_item_persons" add constraint "email_list_item_persons_email_list_item_handle_foreign" foreign key ("email_list_item_handle") references "email_list_item" ("handle") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "email_list_item_persons" add constraint "email_list_item_persons_person_item_handle_foreign" foreign key ("person_item_handle") references "person_item" ("handle") on update cascade on delete cascade;`,
    );

    this.addSql(
      `alter table "email_list_item_companies" add constraint "email_list_item_companies_email_list_item_handle_foreign" foreign key ("email_list_item_handle") references "email_list_item" ("handle") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "email_list_item_companies" add constraint "email_list_item_companies_company_item_handle_foreign" foreign key ("company_item_handle") references "company_item" ("handle") on update cascade on delete cascade;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table "email_list_item_persons" drop constraint "email_list_item_persons_email_list_item_handle_foreign";`,
    );
    this.addSql(
      `alter table "email_list_item_companies" drop constraint "email_list_item_companies_email_list_item_handle_foreign";`,
    );

    this.addSql(`drop table if exists "email_list_item" cascade;`);
    this.addSql(`drop table if exists "email_list_item_persons" cascade;`);
    this.addSql(`drop table if exists "email_list_item_companies" cascade;`);
  }
}
