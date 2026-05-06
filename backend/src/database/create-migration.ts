import 'reflect-metadata';
import * as dotenv from 'dotenv';

import { MikroORM } from '@mikro-orm/core';
import config from './mikro-orm.config';
import { initializeLogger } from '../logging/initialize-logger';

type CliOptions = {
  blank?: boolean;
  initial?: boolean;
  name?: string;
  path?: string;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];

    if (arg === '--blank' || arg === '-b') {
      options.blank = true;
      continue;
    }

    if (arg === '--initial' || arg === '-i') {
      options.initial = true;
      continue;
    }

    if (arg === '--name' || arg === '-n') {
      options.name = argv[index + 1];
      index++;
      continue;
    }

    if (arg === '--path' || arg === '-p') {
      options.path = argv[index + 1];
      index++;
    }
  }

  return options;
}

async function createMigration() {
  dotenv.config();
  initializeLogger();

  const options = parseArgs(process.argv.slice(2));
  const orm = await MikroORM.init(config);

  try {
    const result = await orm.migrator.create(
      options.path,
      options.blank,
      options.initial,
      options.name,
    );

    if (!result.fileName) {
      console.log('No schema changes detected.');
      return;
    }

    console.log(`Created migration: ${result.fileName}`);
  } catch (error) {
    console.error('Migration creation failed:', error);
    process.exit(1);
  } finally {
    await orm.close(true);
  }
}

void createMigration();
