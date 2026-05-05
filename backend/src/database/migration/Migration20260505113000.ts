import { Migration } from '@mikro-orm/migrations';

export class Migration20260505113000 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `alter table "ai_provider_model_item" add column "supports_transcription" boolean not null default false;`,
    );
    this.addSql(
      `update "ai_provider_model_item" set "supports_transcription" = true where "handle" = 'openai-whisper-1';`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(
      `alter table "ai_provider_model_item" drop column "supports_transcription";`,
    );
  }
}