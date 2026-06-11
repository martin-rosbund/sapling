import { Migration } from '@mikro-orm/migrations';

export class Migration20260611133000 extends Migration {
  override up(): void {
    this.addSql(
      `create table "ai_chat_attachment_item" ("handle" serial primary key, "session_handle" int null, "message_handle" int null, "person_handle" int not null, "document_handle" int not null, "import_batch_handle" int null, "purpose" varchar(64) not null default 'importAnalysis', "filename" varchar(256) not null, "mime_type" varchar(128) null, "byte_length" int null, "status" varchar(32) not null default 'analyzed', "summary_payload" jsonb null, "error_payload" jsonb null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );
    this.addSql(
      `alter table "ai_chat_attachment_item" add constraint "ai_chat_attachment_item_session_handle_foreign" foreign key ("session_handle") references "ai_chat_session_item" ("handle") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "ai_chat_attachment_item" add constraint "ai_chat_attachment_item_message_handle_foreign" foreign key ("message_handle") references "ai_chat_message_item" ("handle") on update cascade on delete set null;`,
    );
    this.addSql(
      `alter table "ai_chat_attachment_item" add constraint "ai_chat_attachment_item_person_handle_foreign" foreign key ("person_handle") references "person_item" ("handle") on update cascade;`,
    );
    this.addSql(
      `alter table "ai_chat_attachment_item" add constraint "ai_chat_attachment_item_document_handle_foreign" foreign key ("document_handle") references "document_item" ("handle") on update cascade;`,
    );
    this.addSql(
      `alter table "ai_chat_attachment_item" add constraint "ai_chat_attachment_item_import_batch_handle_foreign" foreign key ("import_batch_handle") references "import_batch_item" ("handle") on update cascade on delete set null;`,
    );
    this.addSql(
      `create index "ai_chat_attachment_item_person_session_index" on "ai_chat_attachment_item" ("person_handle", "session_handle");`,
    );
  }

  override down(): void {
    this.addSql(`drop table if exists "ai_chat_attachment_item" cascade;`);
  }
}
