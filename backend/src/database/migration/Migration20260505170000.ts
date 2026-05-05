import { Migration } from '@mikro-orm/migrations';

export class Migration20260505170000 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `alter table "ai_provider_model_item" add column "embedding_batch_size" int not null default 32, add column "vector_chunk_length" int not null default 1200, add column "vector_chunk_overlap" int not null default 200, add column "vector_search_candidate_multiplier" int not null default 6, add column "vector_search_max_candidate_limit" int not null default 60, add column "vector_search_max_results" int not null default 10;`,
    );
    this.addSql(
      `insert into "ai_provider_model_item" ("handle", "title", "description", "provider_handle", "provider_model", "supports_streaming", "supports_tools", "supports_embeddings", "supports_transcription", "supports_speech", "embedding_batch_size", "vector_chunk_length", "vector_chunk_overlap", "vector_search_candidate_multiplier", "vector_search_max_candidate_limit", "vector_search_max_results", "max_tool_call_iterations", "is_default", "is_active", "sort_order", "speech_voice", "speech_speed", "speech_mime_type", "speech_file_extension", "speech_max_input_length", "created_at", "updated_at") select 'openai-tts-1', 'TTS-1', 'OpenAI real-time optimized speech synthesis model.', 'openai', 'tts-1', false, false, false, false, true, 32, 1200, 200, 6, 60, 10, 20, false, true, 66, 'alloy', 1, 'audio/mpeg', 'mp3', 4000, now(), now() where exists (select 1 from "ai_provider_type_item" where "handle" = 'openai') on conflict ("handle") do update set "title" = excluded."title", "description" = excluded."description", "provider_handle" = excluded."provider_handle", "provider_model" = excluded."provider_model", "supports_speech" = excluded."supports_speech", "speech_voice" = excluded."speech_voice", "speech_speed" = excluded."speech_speed", "speech_mime_type" = excluded."speech_mime_type", "speech_file_extension" = excluded."speech_file_extension", "speech_max_input_length" = excluded."speech_max_input_length", "is_active" = excluded."is_active", "updated_at" = now();`,
    );
    this.addSql(
      `insert into "ai_provider_model_item" ("handle", "title", "description", "provider_handle", "provider_model", "supports_streaming", "supports_tools", "supports_embeddings", "supports_transcription", "supports_speech", "embedding_batch_size", "vector_chunk_length", "vector_chunk_overlap", "vector_search_candidate_multiplier", "vector_search_max_candidate_limit", "vector_search_max_results", "max_tool_call_iterations", "is_default", "is_active", "sort_order", "speech_voice", "speech_speed", "speech_mime_type", "speech_file_extension", "speech_max_input_length", "created_at", "updated_at") select 'openai-tts-1-hd', 'TTS-1 HD', 'OpenAI higher-quality speech synthesis model.', 'openai', 'tts-1-hd', false, false, false, false, true, 32, 1200, 200, 6, 60, 10, 20, false, true, 67, 'alloy', 1, 'audio/mpeg', 'mp3', 4000, now(), now() where exists (select 1 from "ai_provider_type_item" where "handle" = 'openai') on conflict ("handle") do update set "title" = excluded."title", "description" = excluded."description", "provider_handle" = excluded."provider_handle", "provider_model" = excluded."provider_model", "supports_speech" = excluded."supports_speech", "speech_voice" = excluded."speech_voice", "speech_speed" = excluded."speech_speed", "speech_mime_type" = excluded."speech_mime_type", "speech_file_extension" = excluded."speech_file_extension", "speech_max_input_length" = excluded."speech_max_input_length", "is_active" = excluded."is_active", "updated_at" = now();`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `delete from "ai_provider_model_item" where "handle" in ('openai-tts-1', 'openai-tts-1-hd');`,
    );
    this.addSql(
      `alter table "ai_provider_model_item" drop column "embedding_batch_size", drop column "vector_chunk_length", drop column "vector_chunk_overlap", drop column "vector_search_candidate_multiplier", drop column "vector_search_max_candidate_limit", drop column "vector_search_max_results";`,
    );
  }
}
