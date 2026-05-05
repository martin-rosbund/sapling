import { Migration } from '@mikro-orm/migrations';

export class Migration20260505143000 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `alter table "ai_provider_model_item" add column "supports_speech" boolean not null default false, add column "speech_voice" varchar(64) not null default 'nova', add column "speech_speed" real not null default 1, add column "speech_mime_type" varchar(128) not null default 'audio/mpeg', add column "speech_file_extension" varchar(16) not null default 'mp3', add column "speech_max_input_length" int not null default 4000;`,
    );
    this.addSql(
      `insert into "ai_provider_model_item" ("handle", "title", "description", "provider_handle", "provider_model", "supports_streaming", "supports_tools", "supports_embeddings", "supports_transcription", "supports_speech", "max_tool_call_iterations", "is_default", "is_active", "sort_order", "speech_voice", "speech_speed", "speech_mime_type", "speech_file_extension", "speech_max_input_length", "created_at", "updated_at") select 'openai-gpt-4o-mini-tts', 'GPT-4o mini TTS', 'OpenAI speech synthesis model for assistant voice output.', 'openai', 'gpt-4o-mini-tts', false, false, false, false, true, 20, true, true, 65, 'nova', 1, 'audio/mpeg', 'mp3', 4000, now(), now() where exists (select 1 from "ai_provider_type_item" where "handle" = 'openai') on conflict ("handle") do update set "title" = excluded."title", "description" = excluded."description", "provider_handle" = excluded."provider_handle", "provider_model" = excluded."provider_model", "supports_speech" = excluded."supports_speech", "speech_voice" = excluded."speech_voice", "speech_speed" = excluded."speech_speed", "speech_mime_type" = excluded."speech_mime_type", "speech_file_extension" = excluded."speech_file_extension", "speech_max_input_length" = excluded."speech_max_input_length", "is_active" = excluded."is_active", "updated_at" = now();`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `delete from "ai_provider_model_item" where "handle" = 'openai-gpt-4o-mini-tts';`,
    );
    this.addSql(
      `alter table "ai_provider_model_item" drop column "supports_speech", drop column "speech_voice", drop column "speech_speed", drop column "speech_mime_type", drop column "speech_file_extension", drop column "speech_max_input_length";`,
    );
  }
}
