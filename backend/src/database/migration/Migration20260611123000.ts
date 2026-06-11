import { Migration } from '@mikro-orm/migrations';

export class Migration20260611123000 extends Migration {
  override up(): void {
    this.addSql(
      `update "entity_item" set "can_show" = true where "handle" = 'aiChatToolAction';`,
    );
    this.addSql(
      `update "permission_item" set "allow_read" = true, "allow_show" = true where "entity_handle" = 'aiChatToolAction' and "role_handle" in (1, 2, 3);`,
    );
  }

  override down(): void {
    this.addSql(
      `update "permission_item" set "allow_show" = false where "entity_handle" = 'aiChatToolAction' and "role_handle" in (1, 2, 3);`,
    );
  }
}
