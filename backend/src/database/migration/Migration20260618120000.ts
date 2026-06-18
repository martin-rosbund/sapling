import { Migration } from '@mikro-orm/migrations';

export class Migration20260618120000 extends Migration {
  override up(): void {
    this.addSql(
      `alter table "ai_provider_model_item" alter column "max_tool_call_iterations" set default 100;`,
    );
    this.addSql(
      `update "ai_provider_model_item" set "max_tool_call_iterations" = 100, "updated_at" = now() where "max_tool_call_iterations" <> 100;`,
    );
  }

  override down(): void {
    this.addSql(
      `update "ai_provider_model_item" set "max_tool_call_iterations" = 20, "updated_at" = now() where "max_tool_call_iterations" = 100;`,
    );
    this.addSql(
      `alter table "ai_provider_model_item" alter column "max_tool_call_iterations" set default 8;`,
    );
  }
}
