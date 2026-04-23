import { Migration } from '@mikro-orm/migrations';
import { decryptString, encryptString } from '../../security/encrypted-string';

type PersonSessionRow = {
  handle: number;
  access_token: string;
  refresh_token: string;
};

function toSqlStringLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export class Migration20260423153000 extends Migration {
  override async up(): Promise<void> {
    await this.execute(
      `alter table "person_session_item" alter column "access_token" type text;`,
    );
    await this.execute(
      `alter table "person_session_item" alter column "refresh_token" type text;`,
    );

    const rows = (await this.execute(
      `select "handle", "access_token", "refresh_token" from "person_session_item";`,
    )) as PersonSessionRow[];

    for (const row of rows) {
      const nextAccessToken = encryptString(row.access_token);
      const nextRefreshToken = encryptString(row.refresh_token);

      await this.execute(
        `update "person_session_item" set "access_token" = ${toSqlStringLiteral(nextAccessToken ?? '')}, "refresh_token" = ${toSqlStringLiteral(nextRefreshToken ?? '')} where "handle" = ${Number(row.handle)};`,
      );
    }
  }

  override async down(): Promise<void> {
    const rows = (await this.execute(
      `select "handle", "access_token", "refresh_token" from "person_session_item";`,
    )) as PersonSessionRow[];

    for (const row of rows) {
      const nextAccessToken = decryptString(row.access_token);
      const nextRefreshToken = decryptString(row.refresh_token);

      await this.execute(
        `update "person_session_item" set "access_token" = ${toSqlStringLiteral(nextAccessToken ?? '')}, "refresh_token" = ${toSqlStringLiteral(nextRefreshToken ?? '')} where "handle" = ${Number(row.handle)};`,
      );
    }

    await this.execute(
      `alter table "person_session_item" alter column "access_token" type varchar(4096);`,
    );
    await this.execute(
      `alter table "person_session_item" alter column "refresh_token" type varchar(4096);`,
    );
  }
}
