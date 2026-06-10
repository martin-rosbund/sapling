import { Migration } from '@mikro-orm/migrations';

export class Migration20260609123000 extends Migration {
  override up(): void {
    this.addSql(
      `alter table "person_item" alter constraint "person_item_company_handle_foreign" deferrable initially immediate;`,
    );
    this.addSql(
      `alter table "company_item" alter constraint "company_item_account_manager_handle_foreign" deferrable initially immediate;`,
    );
    this.addSql(
      `alter table "company_item" alter constraint "company_item_customer_success_manager_handle_foreign" deferrable initially immediate;`,
    );
  }

  override down(): void {
    this.addSql(
      `alter table "company_item" alter constraint "company_item_customer_success_manager_handle_foreign" not deferrable;`,
    );
    this.addSql(
      `alter table "company_item" alter constraint "company_item_account_manager_handle_foreign" not deferrable;`,
    );
    this.addSql(
      `alter table "person_item" alter constraint "person_item_company_handle_foreign" not deferrable;`,
    );
  }
}
