import 'reflect-metadata';
import * as dotenv from 'dotenv';

import { MikroORM } from '@mikro-orm/core';
import config from './database/mikro-orm.config';
import { DatabaseSeeder } from './database/seeder/DatabaseSeeder';
import { initializeLogger } from './logging/initialize-logger';

type UpdateMode = 'migrate' | 'seed' | 'all';

function getUpdateMode(): UpdateMode {
  const mode = process.env.UPDATE_MODE?.trim().toLowerCase();

  if (!mode) {
    return 'migrate';
  }

  if (mode === 'migrate' || mode === 'seed' || mode === 'all') {
    return mode;
  }

  throw new Error(`Unsupported UPDATE_MODE: ${process.env.UPDATE_MODE}`);
}

/**
 * Runs database maintenance tasks without restarting the application server.
 * By default this applies pending migrations only; seeders run only when
 * explicitly requested through UPDATE_MODE=seed or UPDATE_MODE=all.
 *
 * Usage:
 *   npm run orm:update   # run migrations only
 *   npm run orm:seed     # run seeders only
 *   npm run orm:deploy   # run migrations + seeders
 */
async function update() {
  dotenv.config();
  initializeLogger();
  const mode = getUpdateMode();

  const orm = await MikroORM.init(config);
  try {
    if (mode === 'migrate' || mode === 'all') {
      console.log('Running migrations...');
      await orm.migrator.up();
      console.log('Migrations complete.');
    } else {
      console.log('Skipping migrations (UPDATE_MODE=seed).');
    }

    if (mode === 'seed' || mode === 'all') {
      console.log('Running seeders...');
      await orm.seeder.seed(DatabaseSeeder);
      console.log('Seeders complete.');
    } else {
      console.log('Skipping seeders (UPDATE_MODE=migrate).');
    }
  } catch (err) {
    console.error('Update failed:', err);
    process.exit(1);
  } finally {
    await orm.close();
  }
}

void update();
