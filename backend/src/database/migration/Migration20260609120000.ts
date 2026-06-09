import { Migration } from '@mikro-orm/migrations';

export class Migration20260609120000 extends Migration {
  override up(): void {
    this.addSql(
      `create table "company_industry_item" ("handle" varchar(64) not null, "title" varchar(128) not null, "icon" varchar(64) not null default 'mdi-factory', "color" varchar(32) not null default '#546E7A', "sort_order" int not null default 0, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "company_industry_item_pkey" primary key ("handle"));`,
    );
    this.addSql(
      `create table "company_segment_item" ("handle" varchar(64) not null, "title" varchar(128) not null, "icon" varchar(64) not null default 'mdi-account-group-outline', "color" varchar(32) not null default '#546E7A', "sort_order" int not null default 0, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "company_segment_item_pkey" primary key ("handle"));`,
    );
    this.addSql(
      `create table "company_size_item" ("handle" varchar(64) not null, "title" varchar(128) not null, "icon" varchar(64) not null default 'mdi-office-building', "color" varchar(32) not null default '#546E7A', "sort_order" int not null default 0, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "company_size_item_pkey" primary key ("handle"));`,
    );
    this.addSql(
      `create table "company_annual_revenue_class_item" ("handle" varchar(64) not null, "title" varchar(128) not null, "icon" varchar(64) not null default 'mdi-cash-multiple', "color" varchar(32) not null default '#546E7A', "sort_order" int not null default 0, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "company_annual_revenue_class_item_pkey" primary key ("handle"));`,
    );
    this.addSql(
      `create table "company_churn_risk_reason_item" ("handle" varchar(64) not null, "title" varchar(128) not null, "description" varchar(512) null, "icon" varchar(64) not null default 'mdi-alert-outline', "color" varchar(32) not null default '#EF6C00', "sort_order" int not null default 0, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "company_churn_risk_reason_item_pkey" primary key ("handle"));`,
    );
    this.addSql(
      `create table "person_salutation_item" ("handle" varchar(64) not null, "title" varchar(128) not null, "icon" varchar(64) not null default 'mdi-card-account-details-outline', "color" varchar(32) not null default '#546E7A', "sort_order" int not null default 0, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "person_salutation_item_pkey" primary key ("handle"));`,
    );
    this.addSql(
      `create table "person_title_item" ("handle" varchar(64) not null, "title" varchar(128) not null, "icon" varchar(64) not null default 'mdi-school-outline', "color" varchar(32) not null default '#546E7A', "sort_order" int not null default 0, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "person_title_item_pkey" primary key ("handle"));`,
    );
    this.addSql(
      `create table "person_job_title_item" ("handle" varchar(64) not null, "title" varchar(128) not null, "icon" varchar(64) not null default 'mdi-briefcase-account-outline', "color" varchar(32) not null default '#546E7A', "sort_order" int not null default 0, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "person_job_title_item_pkey" primary key ("handle"));`,
    );
    this.addSql(
      `create table "person_function_item" ("handle" varchar(64) not null, "title" varchar(128) not null, "icon" varchar(64) not null default 'mdi-account-tie-outline', "color" varchar(32) not null default '#546E7A', "sort_order" int not null default 0, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "person_function_item_pkey" primary key ("handle"));`,
    );
    this.addSql(
      `create table "person_decision_role_item" ("handle" varchar(64) not null, "title" varchar(128) not null, "icon" varchar(64) not null default 'mdi-account-check-outline', "color" varchar(32) not null default '#546E7A', "sort_order" int not null default 0, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "person_decision_role_item_pkey" primary key ("handle"));`,
    );
    this.addSql(
      `create table "sales_opportunity_result_status_item" ("handle" varchar(64) not null, "title" varchar(128) not null, "is_closed" boolean not null default false, "is_success" boolean not null default false, "icon" varchar(64) not null default 'mdi-circle-outline', "color" varchar(32) not null default '#546E7A', "sort_order" int not null default 0, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "sales_opportunity_result_status_item_pkey" primary key ("handle"));`,
    );
    this.addSql(
      `create table "sales_opportunity_loss_reason_item" ("handle" varchar(64) not null, "title" varchar(128) not null, "description" varchar(512) null, "icon" varchar(64) not null default 'mdi-close-circle-outline', "color" varchar(32) not null default '#9E9E9E', "sort_order" int not null default 0, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "sales_opportunity_loss_reason_item_pkey" primary key ("handle"));`,
    );
    this.addSql(
      `create table "marketing_campaign_status_item" ("handle" varchar(64) not null, "title" varchar(128) not null, "icon" varchar(64) not null default 'mdi-calendar-clock', "color" varchar(32) not null default '#546E7A', "sort_order" int not null default 0, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "marketing_campaign_status_item_pkey" primary key ("handle"));`,
    );
    this.addSql(
      `create table "marketing_campaign_type_item" ("handle" varchar(64) not null, "title" varchar(128) not null, "icon" varchar(64) not null default 'mdi-bullhorn-outline', "color" varchar(32) not null default '#546E7A', "sort_order" int not null default 0, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "marketing_campaign_type_item_pkey" primary key ("handle"));`,
    );

    this.addSql(
      `alter table "company_item" add column "data_privacy_consent_given" boolean not null default false, add column "data_privacy_consent_at" date null, add column "employee_count" int null, add column "contract_value" real null, add column "annual_recurring_revenue" real null, add column "monthly_recurring_revenue" real null, add column "account_manager_handle" int null, add column "customer_success_manager_handle" int null, add column "industry_handle" varchar(64) null, add column "segment_handle" varchar(64) null, add column "size_handle" varchar(64) null, add column "annual_revenue_class_handle" varchar(64) null, add column "churn_risk_reason_handle" varchar(64) null;`,
    );
    this.addSql(
      `alter table "person_item" add column "salutation_handle" varchar(64) null, add column "title_handle" varchar(64) null, add column "job_title_handle" varchar(64) null, add column "job_function_handle" varchar(64) null, add column "decision_role_handle" varchar(64) null;`,
    );
    this.addSql(
      `alter table "sales_opportunity_item" add column "result_status_handle" varchar(64) not null default 'open', add column "loss_reason_handle" varchar(64) null;`,
    );
    this.addSql(
      `create table "sales_opportunity_item_competitors" ("sales_opportunity_item_handle" int not null, "company_item_handle" int not null, primary key ("sales_opportunity_item_handle", "company_item_handle"));`,
    );
    this.addSql(
      `create table "marketing_campaign_item" ("handle" serial primary key, "name" varchar(128) not null, "description" text null, "start_date" date null, "end_date" date null, "is_active" boolean not null default true, "status_handle" varchar(64) not null default 'planned', "type_handle" varchar(64) not null default 'newsletter', "target_list_handle" int null, "email_template_handle" int null, "owner_person_handle" int null, "opportunity_source_handle" int null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );

    this.addSql(
      `alter table "company_item" add constraint "company_item_account_manager_handle_foreign" foreign key ("account_manager_handle") references "person_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "company_item" add constraint "company_item_customer_success_manager_handle_foreign" foreign key ("customer_success_manager_handle") references "person_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "company_item" add constraint "company_item_industry_handle_foreign" foreign key ("industry_handle") references "company_industry_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "company_item" add constraint "company_item_segment_handle_foreign" foreign key ("segment_handle") references "company_segment_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "company_item" add constraint "company_item_size_handle_foreign" foreign key ("size_handle") references "company_size_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "company_item" add constraint "company_item_annual_revenue_class_handle_foreign" foreign key ("annual_revenue_class_handle") references "company_annual_revenue_class_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "company_item" add constraint "company_item_churn_risk_reason_handle_foreign" foreign key ("churn_risk_reason_handle") references "company_churn_risk_reason_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "person_item" add constraint "person_item_salutation_handle_foreign" foreign key ("salutation_handle") references "person_salutation_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "person_item" add constraint "person_item_title_handle_foreign" foreign key ("title_handle") references "person_title_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "person_item" add constraint "person_item_job_title_handle_foreign" foreign key ("job_title_handle") references "person_job_title_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "person_item" add constraint "person_item_job_function_handle_foreign" foreign key ("job_function_handle") references "person_function_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "person_item" add constraint "person_item_decision_role_handle_foreign" foreign key ("decision_role_handle") references "person_decision_role_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "sales_opportunity_item" add constraint "sales_opportunity_item_result_status_handle_foreign" foreign key ("result_status_handle") references "sales_opportunity_result_status_item" ("handle");`,
    );
    this.addSql(
      `alter table "sales_opportunity_item" add constraint "sales_opportunity_item_loss_reason_handle_foreign" foreign key ("loss_reason_handle") references "sales_opportunity_loss_reason_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "sales_opportunity_item_competitors" add constraint "sales_opportunity_item_competitors_opportunity_foreign" foreign key ("sales_opportunity_item_handle") references "sales_opportunity_item" ("handle") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "sales_opportunity_item_competitors" add constraint "sales_opportunity_item_competitors_company_foreign" foreign key ("company_item_handle") references "company_item" ("handle") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "marketing_campaign_item" add constraint "marketing_campaign_item_status_handle_foreign" foreign key ("status_handle") references "marketing_campaign_status_item" ("handle");`,
    );
    this.addSql(
      `alter table "marketing_campaign_item" add constraint "marketing_campaign_item_type_handle_foreign" foreign key ("type_handle") references "marketing_campaign_type_item" ("handle");`,
    );
    this.addSql(
      `alter table "marketing_campaign_item" add constraint "marketing_campaign_item_target_list_handle_foreign" foreign key ("target_list_handle") references "email_list_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "marketing_campaign_item" add constraint "marketing_campaign_item_email_template_handle_foreign" foreign key ("email_template_handle") references "email_template_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "marketing_campaign_item" add constraint "marketing_campaign_item_owner_person_handle_foreign" foreign key ("owner_person_handle") references "person_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "marketing_campaign_item" add constraint "marketing_campaign_item_opportunity_source_handle_foreign" foreign key ("opportunity_source_handle") references "sales_opportunity_source_item" ("handle") on delete set null;`,
    );
  }

  override down(): void {
    this.addSql(`drop table if exists "marketing_campaign_item" cascade;`);
    this.addSql(
      `drop table if exists "sales_opportunity_item_competitors" cascade;`,
    );
    this.addSql(
      `alter table "sales_opportunity_item" drop column if exists "result_status_handle", drop column if exists "loss_reason_handle";`,
    );
    this.addSql(
      `alter table "person_item" drop column if exists "salutation_handle", drop column if exists "title_handle", drop column if exists "job_title_handle", drop column if exists "job_function_handle", drop column if exists "decision_role_handle";`,
    );
    this.addSql(
      `alter table "company_item" drop column if exists "data_privacy_consent_given", drop column if exists "data_privacy_consent_at", drop column if exists "employee_count", drop column if exists "contract_value", drop column if exists "annual_recurring_revenue", drop column if exists "monthly_recurring_revenue", drop column if exists "account_manager_handle", drop column if exists "customer_success_manager_handle", drop column if exists "industry_handle", drop column if exists "segment_handle", drop column if exists "size_handle", drop column if exists "annual_revenue_class_handle", drop column if exists "churn_risk_reason_handle";`,
    );
    this.addSql(`drop table if exists "marketing_campaign_type_item" cascade;`);
    this.addSql(
      `drop table if exists "marketing_campaign_status_item" cascade;`,
    );
    this.addSql(
      `drop table if exists "sales_opportunity_loss_reason_item" cascade;`,
    );
    this.addSql(
      `drop table if exists "sales_opportunity_result_status_item" cascade;`,
    );
    this.addSql(`drop table if exists "person_decision_role_item" cascade;`);
    this.addSql(`drop table if exists "person_function_item" cascade;`);
    this.addSql(`drop table if exists "person_job_title_item" cascade;`);
    this.addSql(`drop table if exists "person_title_item" cascade;`);
    this.addSql(`drop table if exists "person_salutation_item" cascade;`);
    this.addSql(
      `drop table if exists "company_churn_risk_reason_item" cascade;`,
    );
    this.addSql(
      `drop table if exists "company_annual_revenue_class_item" cascade;`,
    );
    this.addSql(`drop table if exists "company_size_item" cascade;`);
    this.addSql(`drop table if exists "company_segment_item" cascade;`);
    this.addSql(`drop table if exists "company_industry_item" cascade;`);
  }
}
