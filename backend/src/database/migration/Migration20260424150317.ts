import { Migration } from '@mikro-orm/migrations';

export class Migration20260424150317 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(`create extension if not exists vector;`);

    this.addSql(
      `create table "ai_vector_document_item" ("handle" serial primary key, "source_entity_handle" varchar(64) not null, "source_record_handle" varchar(128) not null, "source_section" varchar(64) not null, "chunk_index" int not null default 0, "title" varchar(256) null, "content" text not null, "content_hash" varchar(64) not null, "metadata" jsonb null, "provider_handle" varchar(64) not null, "model_handle" varchar(128) not null, "embedding_dimensions" int not null, "embedding" vector not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );
    this.addSql(
      `alter table "ai_vector_document_item" add constraint "ai_vector_document_item_source_entity_handle_sour_09f0c_unique" unique ("source_entity_handle", "source_record_handle", "source_section", "chunk_index");`,
    );

    this.addSql(
      `alter table "ai_provider_model_item" add "supports_embeddings" boolean not null default false;`,
    );
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "ai_vector_document_item" cascade;`);

    this.addSql(
      `alter table "ai_provider_model_item" drop column "supports_embeddings";`,
    );
  }
}
