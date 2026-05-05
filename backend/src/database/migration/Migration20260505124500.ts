import { Migration } from '@mikro-orm/migrations';

export class Migration20260505124500 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `create table "ai_chat_transcription_item" ("handle" serial primary key, "session_handle" int null, "message_handle" int null, "document_handle" int null, "person_handle" int not null, "provider_handle" varchar(64) null, "model_handle" varchar(64) null, "status" varchar(32) not null default 'processing', "transcript" varchar(16384) null, "detected_language" varchar(16) null, "mime_type" varchar(128) not null, "byte_length" int not null, "duration_seconds" float null, "request_payload" jsonb null, "response_payload" jsonb null, "failure_payload" jsonb null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );
    this.addSql(
      `alter table "ai_chat_transcription_item" add constraint "ai_chat_transcription_item_session_handle_foreign" foreign key ("session_handle") references "ai_chat_session_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "ai_chat_transcription_item" add constraint "ai_chat_transcription_item_message_handle_foreign" foreign key ("message_handle") references "ai_chat_message_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "ai_chat_transcription_item" add constraint "ai_chat_transcription_item_document_handle_foreign" foreign key ("document_handle") references "document_item" ("handle");`,
    );
    this.addSql(
      `alter table "ai_chat_transcription_item" add constraint "ai_chat_transcription_item_person_handle_foreign" foreign key ("person_handle") references "person_item" ("handle");`,
    );
    this.addSql(
      `alter table "ai_chat_transcription_item" add constraint "ai_chat_transcription_item_provider_handle_foreign" foreign key ("provider_handle") references "ai_provider_type_item" ("handle") on delete set null;`,
    );
    this.addSql(
      `alter table "ai_chat_transcription_item" add constraint "ai_chat_transcription_item_model_handle_foreign" foreign key ("model_handle") references "ai_provider_model_item" ("handle") on delete set null;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table "ai_chat_transcription_item" drop constraint "ai_chat_transcription_item_model_handle_foreign";`,
    );
    this.addSql(
      `alter table "ai_chat_transcription_item" drop constraint "ai_chat_transcription_item_provider_handle_foreign";`,
    );
    this.addSql(
      `alter table "ai_chat_transcription_item" drop constraint "ai_chat_transcription_item_person_handle_foreign";`,
    );
    this.addSql(
      `alter table "ai_chat_transcription_item" drop constraint "ai_chat_transcription_item_document_handle_foreign";`,
    );
    this.addSql(
      `alter table "ai_chat_transcription_item" drop constraint "ai_chat_transcription_item_message_handle_foreign";`,
    );
    this.addSql(
      `alter table "ai_chat_transcription_item" drop constraint "ai_chat_transcription_item_session_handle_foreign";`,
    );

    this.addSql(`drop table if exists "ai_chat_transcription_item" cascade;`);
  }
}