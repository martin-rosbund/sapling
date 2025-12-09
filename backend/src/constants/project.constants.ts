import { IOIDCStrategyOption } from 'passport-azure-ad';
import 'dotenv/config';
export const SAPLING_VERSION: string = process.env.SAPLING_VERSION || '1.0.0';
export const REDIS_ENABLED: boolean = process.env.REDIS_ENABLED === 'true';
export const REDIS_SERVER: string = process.env.REDIS_SERVER || 'localhost';
export const REDIS_PORT: number = parseInt(
  process.env.REDIS_PORT || '6379',
  10,
);
export const REDIS_ATTEMPTS: number = parseInt(
  process.env.REDIS_ATTEMPTS || '5',
  10,
);
export const REDIS_REMOVE_ON_FAIL: number = parseInt(
  process.env.REDIS_REMOVE_ON_FAIL || '100',
  10,
);
export const REDIS_BACKOFF_STRATEGY: string =
  process.env.REDIS_BACKOFF_STRATEGY || 'exponential';
export const REDIS_BACKOFF_DELAY: number = parseInt(
  process.env.REDIS_BACKOFF_DELAY || '1000',
  10,
);
export const REDIS_REMOVE_ON_COMPLETE: boolean =
  process.env.REDIS_REMOVE_ON_COMPLETE === 'true';
export const GOOGLE_CLIENT_ID: string = process.env.GOOGLE_CLIENT_ID || '';
export const GOOGLE_CLIENT_SECRET: string =
  process.env.GOOGLE_CLIENT_SECRET || '';
export const GOOGLE_CALLBACK_URL: string =
  process.env.GOOGLE_CALLBACK_URL || '';
export const GOOGLE_SCOPE: string[] = process.env.GOOGLE_SCOPE
  ? process.env.GOOGLE_SCOPE.split(',')
  : [];

export const WEBHOOK_TIMEOUT: number = parseInt(
  process.env.WEBHOOK_TIMEOUT || '5000',
  10,
);
export const WEBHOOK_MAX_REDIRECTS: number = parseInt(
  process.env.WEBHOOK_MAX_REDIRECTS || '5',
  10,
);

export const AZURE_AD_IDENTITY_METADATA: string =
  process.env.AZURE_AD_IDENTITY_METADATA || '';
export const AZURE_AD_CLIENT_ID: string = process.env.AZURE_AD_CLIENT_ID || '';
export const AZURE_AD_CLIENT_SECRET: string =
  process.env.AZURE_AD_CLIENT_SECRET || '';
export const AZURE_AD_RESPONSE_TYPE: IOIDCStrategyOption['responseType'] =
  (process.env.AZURE_AD_RESPONSE_TYPE as
    | 'code'
    | 'code id_token'
    | 'id_token code'
    | 'id_token') || 'code';
export const AZURE_AD_RESPONSE_MODE: IOIDCStrategyOption['responseMode'] =
  (process.env.AZURE_AD_RESPONSE_MODE as 'form_post' | 'query') || 'form_post';
export const AZURE_AD_REDIRECT_URL: string =
  process.env.AZURE_AD_REDIRECT_URL || '';
export const AZURE_AD_ALLOW_HTTP: boolean =
  process.env.AZURE_AD_ALLOW_HTTP === 'true';
export const AZURE_AD_SCOPE: string[] = process.env.AZURE_AD_SCOPE
  ? process.env.AZURE_AD_SCOPE.split(',')
  : [];

export const DB_DRIVER: string = process.env.DB_DRIVER || 'sqllite';
export const DB_NAME: string = process.env.DB_NAME || 'database.sqlite3';
export const DB_DATA_SEEDER: string = process.env.DB_DATA_SEEDER || 'demo';
export const DB_LOGGING: boolean = process.env.DB_LOGGING === 'true';
export const DB_HOST: string = process.env.DB_HOST || '';
export const DB_PORT: number = parseInt(process.env.DB_PORT || '3306', 10);
export const DB_USER: string = process.env.DB_USER || '';
export const DB_PASSWORD: string = process.env.DB_PASSWORD || '';

export const SAPLING_SECRET: string = process.env.SAPLING_SECRET || '';
export const SAPLING_FRONTEND_URL: string =
  process.env.SAPLING_FRONTEND_URL || '';
export const SAPLING_HASH_INDICATOR: string =
  process.env.SAPLING_HASH_INDICATOR || '$2b$';
export const SAPLING_HASH_COST: number = parseInt(
  process.env.SAPLING_HASH_COST || '10',
  10,
);

export const LOG_OUTPUT_PATH: string = process.env.LOG_OUTPUT_PATH || '../log';
export const LOG_BACKUP_FILES: number = parseInt(
  process.env.LOG_BACKUP_FILES || '14',
  10,
);
export const LOG_LEVEL: string = process.env.LOG_LEVEL || 'info';
export const LOG_NAME_REQUESTS: string =
  process.env.LOG_NAME_REQUESTS || 'request.log';
export const LOG_NAME_SERVER: string =
  process.env.LOG_NAME_SERVER || 'server.log';
export const LOG_APPENDERS: string[] = process.env.LOG_APPENDERS
  ? process.env.LOG_APPENDERS.split(',')
  : ['console', 'file'];

export const AI_PROVIDER: string = process.env.AI_PROVIDER || '';
export const AI_OPENAI_API_KEY: string = process.env.AI_OPENAI_API_KEY || '';
export const AI_GEMINI_API_KEY: string = process.env.AI_GEMINI_API_KEY || '';

export const PORT: number = parseInt(process.env.PORT || '3000', 10);
