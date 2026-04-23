import 'reflect-metadata';
import * as dotenv from 'dotenv';

import { MikroORM } from '@mikro-orm/core';
import config from './database/mikro-orm.config';
import { DatabaseSeeder } from './database/seeder/DatabaseSeeder';
import { initializeLogger } from './logging/initialize-logger';

/**
 * Runs all pending database migrations and, unless SKIP_SEED=true, seeds the database.
 * Execute this script manually before or after a deployment to apply
 * schema changes and seed data without restarting the application server.
 *
 * Usage:
 *   npm run orm:update              # run migrations + seeders
 *   SKIP_SEED=true npm run orm:update  # run migrations only
 */
async function update() {
  dotenv.config();
  initializeLogger();

  const orm = await MikroORM.init(config);
  try {
    console.log('Running migrations...');
    await orm.migrator.up();
    console.log('Migrations complete.');

    if (process.env.SKIP_SEED === 'true') {
      console.log('Skipping seeders (SKIP_SEED=true).');
    } else {
      console.log('Running seeders...');
      await orm.seeder.seed(DatabaseSeeder);
      console.log('Seeders complete.');
    }
  } catch (err) {
    console.error('Update failed:', err);
    process.exit(1);
  } finally {
    await orm.close();
  }
}

void update();
