import 'reflect-metadata';
import * as dotenv from 'dotenv';

import { MikroORM } from '@mikro-orm/core';
import config from './database/mikro-orm.config';
import { initializeLogger } from './logging/initialize-logger';
import { TicketSearchEmbeddingService } from './api/ai/ticket-search-embedding.service';
import { TicketSearchIndexService } from './api/ai/ticket-search-index.service';

type VectorizeOptions = {
  batchSize?: number;
  limit?: number;
  force: boolean;
  includeEmbeddings: boolean;
  providerHandle?: string;
  model?: string;
};

function getPositiveIntegerFromEnv(name: string): number | undefined {
  const rawValue = process.env[name]?.trim();

  if (!rawValue) {
    return undefined;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`Invalid ${name}: ${process.env[name]}`);
  }

  return parsedValue;
}

function getBooleanFromEnv(name: string): boolean {
  const rawValue = process.env[name]?.trim().toLowerCase();

  return rawValue === '1' || rawValue === 'true' || rawValue === 'yes';
}

function getVectorizeOptions(): VectorizeOptions {
  return {
    batchSize: getPositiveIntegerFromEnv('VECTORIZE_BATCH_SIZE'),
    limit: getPositiveIntegerFromEnv('VECTORIZE_LIMIT'),
    force: getBooleanFromEnv('VECTORIZE_FORCE'),
    includeEmbeddings:
      process.env.VECTORIZE_EMBEDDINGS == null
        ? true
        : getBooleanFromEnv('VECTORIZE_EMBEDDINGS'),
    providerHandle: process.env.VECTORIZE_PROVIDER?.trim() || undefined,
    model: process.env.VECTORIZE_MODEL?.trim() || undefined,
  };
}

async function vectorize() {
  dotenv.config();
  initializeLogger();

  const options = getVectorizeOptions();
  const orm = await MikroORM.init(config);

  try {
    console.log('Backfilling ticket search documents...');
    console.log(
      `Options: batchSize=${options.batchSize ?? 100}, limit=${options.limit ?? 'all'}, force=${options.force}, includeEmbeddings=${options.includeEmbeddings}, provider=${options.providerHandle ?? 'auto'}, model=${options.model ?? 'auto'}`,
    );

    const embeddingService = new TicketSearchEmbeddingService(orm.em.fork());
    const service = new TicketSearchIndexService(
      orm.em.fork(),
      embeddingService,
    );
    const result = await service.backfillTickets(options);

    console.log('Ticket search backfill complete.');
    console.log(
      `Processed=${result.processed}, created=${result.created}, updated=${result.updated}, skipped=${result.skipped}`,
    );
  } catch (error) {
    console.error('Vectorize failed:', error);
    process.exit(1);
  } finally {
    await orm.close();
  }
}

void vectorize();
