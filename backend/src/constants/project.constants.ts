
import 'dotenv/config';

/**
 * @constant {string[]} SAPLING_WHITELISTED_IPS
 * List of IP addresses allowed to access Sapling. Defaults to localhost addresses if not set.
 */
export const SAPLING_WHITELISTED_IPS: string[] = process.env.SAPLING_WHITELISTED_IPS
  ? process.env.SAPLING_WHITELISTED_IPS.split(',')
  : ['127.0.0.1', '::1'];

/**
 * @constant {number} SAPLING_CODE_COUNT
 * Number of codes available for Sapling. Defaults to 0.
 */
export const SAPLING_CODE_COUNT: number = parseInt(process.env.SAPLING_CODE_COUNT || '0', 0);

/**
 * @constant {boolean} REDIS_ENABLED
 * Indicates if Redis is enabled for queue management. Defaults to false.
 */
export const REDIS_ENABLED: boolean = process.env.REDIS_ENABLED === 'true';

/**
 * @constant {string} REDIS_SERVER
 * Redis server hostname. Defaults to 'localhost'.
 */
export const REDIS_SERVER: string = process.env.REDIS_SERVER || 'localhost';

/**
 * @constant {string} REDIS_USERNAME
 * Redis server username. Defaults to empty string.
 */
export const REDIS_USERNAME: string = process.env.REDIS_USERNAME || '';

/**
 * @constant {string} REDIS_PASSWORD
 * Redis server password. Defaults to empty string.
 */
export const REDIS_PASSWORD: string = process.env.REDIS_PASSWORD || '';

/**
 * @constant {number} REDIS_PORT
 * Redis server port. Defaults to 6379.
 */
export const REDIS_PORT: number = parseInt(process.env.REDIS_PORT || '6379', 10);

/**
 * @constant {number} REDIS_ATTEMPTS
 * Number of Redis connection attempts. Defaults to 20.
 */
export const REDIS_ATTEMPTS: number = parseInt(process.env.REDIS_ATTEMPTS || '20', 10);

/**
 * @constant {number} REDIS_REMOVE_ON_FAIL
 * Number of failed jobs to remove from Redis. Defaults to 100.
 */
export const REDIS_REMOVE_ON_FAIL: number = parseInt(process.env.REDIS_REMOVE_ON_FAIL || '100', 10);

/**
 * @constant {string} REDIS_BACKOFF_STRATEGY
 * Redis backoff strategy for retries. Defaults to 'exponential'.
 */
export const REDIS_BACKOFF_STRATEGY: string = process.env.REDIS_BACKOFF_STRATEGY || 'exponential';

/**
 * @constant {number} REDIS_BACKOFF_DELAY
 * Delay in ms for Redis backoff strategy. Defaults to 1000.
 */
export const REDIS_BACKOFF_DELAY: number = parseInt(process.env.REDIS_BACKOFF_DELAY || '1000', 10);

/**
 * @constant {boolean} REDIS_REMOVE_ON_COMPLETE
 * Indicates if completed jobs should be removed from Redis. Defaults to false.
 */
export const REDIS_REMOVE_ON_COMPLETE: boolean = process.env.REDIS_REMOVE_ON_COMPLETE === 'true';

/**
 * @constant {string} GOOGLE_CLIENT_ID
 * Google OAuth client ID. Defaults to empty string.
 */
export const GOOGLE_CLIENT_ID: string = process.env.GOOGLE_CLIENT_ID || '';

/**
 * @constant {string} GOOGLE_CLIENT_SECRET
 * Google OAuth client secret. Defaults to empty string.
 */
export const GOOGLE_CLIENT_SECRET: string = process.env.GOOGLE_CLIENT_SECRET || '';

/**
 * @constant {string} GOOGLE_CALLBACK_URL
 * Google OAuth callback URL. Defaults to empty string.
 */
export const GOOGLE_CALLBACK_URL: string = process.env.GOOGLE_CALLBACK_URL || '';

/**
 * @constant {string[]} GOOGLE_SCOPE
 * Google OAuth scopes. Defaults to empty array.
 */
export const GOOGLE_SCOPE: string[] = process.env.GOOGLE_SCOPE
  ? process.env.GOOGLE_SCOPE.split(',')
  : [];

/**
 * @constant {number} WEBHOOK_TIMEOUT
 * Timeout in ms for webhook requests. Defaults to 5000.
 */
export const WEBHOOK_TIMEOUT: number = parseInt(process.env.WEBHOOK_TIMEOUT || '5000', 10);

/**
 * @constant {number} WEBHOOK_MAX_REDIRECTS
 * Maximum number of redirects for webhook requests. Defaults to 5.
 */
export const WEBHOOK_MAX_REDIRECTS: number = parseInt(process.env.WEBHOOK_MAX_REDIRECTS || '5', 10);

/**
 * @constant {string} AZURE_AD_TENNANT_ID
 * Azure AD tenant ID. Defaults to empty string.
 */
export const AZURE_AD_TENNANT_ID: string = process.env.AZURE_AD_TENNANT_ID || '';

/**
 * @constant {string} AZURE_AD_CLIENT_ID
 * Azure AD client ID. Defaults to empty string.
 */
export const AZURE_AD_CLIENT_ID: string = process.env.AZURE_AD_CLIENT_ID || '';

/**
 * @constant {string} AZURE_AD_CLIENT_SECRET
 * Azure AD client secret. Defaults to empty string.
 */
export const AZURE_AD_CLIENT_SECRET: string = process.env.AZURE_AD_CLIENT_SECRET || '';

/**
 * @constant {string} AZURE_AD_RESPONSE_TYPE
 * Azure AD OAuth response type. Defaults to 'code'.
 */
export const AZURE_AD_RESPONSE_TYPE: string =
  (process.env.AZURE_AD_RESPONSE_TYPE as
    | 'code'
    | 'code id_token'
    | 'id_token code'
    | 'id_token') || 'code';

/**
 * @constant {string} AZURE_AD_RESPONSE_MODE
 * Azure AD OAuth response mode. Defaults to 'form_post'.
 */
export const AZURE_AD_RESPONSE_MODE: string =
  (process.env.AZURE_AD_RESPONSE_MODE as 'form_post' | 'query') || 'form_post';

/**
 * @constant {string} AZURE_AD_REDIRECT_URL
 * Azure AD OAuth redirect URL. Defaults to empty string.
 */
export const AZURE_AD_REDIRECT_URL: string = process.env.AZURE_AD_REDIRECT_URL || '';

/**
 * @constant {boolean} AZURE_AD_ALLOW_HTTP
 * Allows HTTP for Azure AD OAuth. Defaults to false.
 */
export const AZURE_AD_ALLOW_HTTP: boolean = process.env.AZURE_AD_ALLOW_HTTP === 'true';

/**
 * @constant {string[]} AZURE_AD_SCOPE
 * Azure AD OAuth scopes. Defaults to empty array.
 */
export const AZURE_AD_SCOPE: string[] = process.env.AZURE_AD_SCOPE
  ? process.env.AZURE_AD_SCOPE.split(',')
  : [];

/**
 * @constant {string} DB_DRIVER
 * Database driver type. Defaults to 'sqllite'.
 */
export const DB_DRIVER: string = process.env.DB_DRIVER || 'sqllite';

/**
 * @constant {string} DB_NAME
 * Database name. Defaults to 'database.sqlite3'.
 */
export const DB_NAME: string = process.env.DB_NAME || 'database.sqlite3';

/**
 * @constant {string} DB_DATA_SEEDER
 * Database seeder type. Defaults to 'demonstration'.
 */
export const DB_DATA_SEEDER: string = process.env.DB_DATA_SEEDER || 'demonstration';

/**
 * @constant {boolean} DB_LOGGING
 * Enables database logging. Defaults to false.
 */
export const DB_LOGGING: boolean = process.env.DB_LOGGING === 'true';

/**
 * @constant {string} DB_HOST
 * Database host. Defaults to empty string.
 */
export const DB_HOST: string = process.env.DB_HOST || '';

/**
 * @constant {number} DB_PORT
 * Database port. Defaults to 3306.
 */
export const DB_PORT: number = parseInt(process.env.DB_PORT || '3306', 10);

/**
 * @constant {string} DB_USER
 * Database username. Defaults to empty string.
 */
export const DB_USER: string = process.env.DB_USER || '';

/**
 * @constant {string} DB_PASSWORD
 * Database password. Defaults to empty string.
 */
export const DB_PASSWORD: string = process.env.DB_PASSWORD || '';

/**
 * @constant {string} SAPLING_SECRET
 * Secret key for Sapling application. Defaults to empty string.
 */
export const SAPLING_SECRET: string = process.env.SAPLING_SECRET || '';

/**
 * @constant {string} SAPLING_FRONTEND_URL
 * URL for Sapling frontend application. Defaults to empty string.
 */
export const SAPLING_FRONTEND_URL: string = process.env.SAPLING_FRONTEND_URL || '';

/**
 * @constant {string} SAPLING_HASH_INDICATOR
 * Hash indicator for password hashing. Defaults to '$2b$'.
 */
export const SAPLING_HASH_INDICATOR: string = process.env.SAPLING_HASH_INDICATOR || '$2b$';

/**
 * @constant {number} SAPLING_HASH_COST
 * Cost factor for password hashing. Defaults to 10.
 */
export const SAPLING_HASH_COST: number = parseInt(process.env.SAPLING_HASH_COST || '10', 10);

/**
 * @constant {string} LOG_OUTPUT_PATH
 * Path for log output files. Defaults to '../log'.
 */
export const LOG_OUTPUT_PATH: string = process.env.LOG_OUTPUT_PATH || '../log';

/**
 * @constant {number} LOG_BACKUP_FILES
 * Number of backup log files to keep. Defaults to 14.
 */
export const LOG_BACKUP_FILES: number = parseInt(process.env.LOG_BACKUP_FILES || '14', 10);

/**
 * @constant {string} LOG_LEVEL
 * Logging level. Defaults to 'info'.
 */
export const LOG_LEVEL: string = process.env.LOG_LEVEL || 'info';

/**
 * @constant {string} LOG_NAME_REQUESTS
 * Log file name for requests. Defaults to 'request.log'.
 */
export const LOG_NAME_REQUESTS: string = process.env.LOG_NAME_REQUESTS || 'request.log';

/**
 * @constant {string} LOG_NAME_SERVER
 * Log file name for server logs. Defaults to 'server.log'.
 */
export const LOG_NAME_SERVER: string = process.env.LOG_NAME_SERVER || 'server.log';

/**
 * @constant {string[]} LOG_APPENDERS
 * List of log appenders. Defaults to ['console', 'file'].
 */
export const LOG_APPENDERS: string[] = process.env.LOG_APPENDERS
  ? process.env.LOG_APPENDERS.split(',')
  : ['console', 'file'];

/**
 * @constant {string} AI_PROVIDER
 * AI provider name. Defaults to empty string.
 */
export const AI_PROVIDER: string = process.env.AI_PROVIDER || '';

/**
 * @constant {string} AI_OPENAI_API_KEY
 * OpenAI API key for AI integration. Defaults to empty string.
 */
export const AI_OPENAI_API_KEY: string = process.env.AI_OPENAI_API_KEY || '';

/**
 * @constant {string} AI_GEMINI_API_KEY
 * Gemini API key for AI integration. Defaults to empty string.
 */
export const AI_GEMINI_API_KEY: string = process.env.AI_GEMINI_API_KEY || '';

/**
 * @constant {number} PORT
 * Application port. Defaults to 3000.
 */
export const PORT: number = parseInt(process.env.PORT || '3000', 10);

/**
 * @constant {string} GITHUB_REPO
 * GitHub repository name. Defaults to empty string.
 */
export const GITHUB_REPO: string = process.env.GITHUB_REPO || '';

/**
 * @constant {string} GITHUB_API_URL
 * GitHub API URL. Defaults to 'https://api.github.com'.
 */
export const GITHUB_API_URL: string = process.env.GITHUB_API_URL || 'https://api.github.com';

/**
 * @constant {string} GITHUB_TOKEN
 * GitHub API token. Defaults to empty string.
 */
export const GITHUB_TOKEN: string = process.env.GITHUB_TOKEN || '';

/**
 * @constant {string} API_TITLE
 * API title for documentation. Defaults to 'Sapling API'.
 */
export const API_TITLE: string = process.env.API_TITLE || 'Sapling API';

/**
 * @constant {string} API_VERSION
 * API version for documentation. Defaults to '1.0.0'.
 */
export const API_VERSION: string = process.env.API_VERSION || '1.0.0';

/**
 * @constant {string} API_DESCRIPTION
 * API description for documentation. Defaults to 'API for Sapling application'.
 */
export const API_DESCRIPTION: string = process.env.API_DESCRIPTION || 'API for Sapling application';

/**
 * @constant {string} API_CONTACT_NAME
 * API contact name for documentation. Defaults to 'Martin Rosbund'.
 */
export const API_CONTACT_NAME: string = process.env.API_CONTACT_NAME || 'Martin Rosbund';

/**
 * @constant {string} API_CONTACT_URL
 * API contact URL for documentation. Defaults to 'craffel.de'.
 */
export const API_CONTACT_URL: string = process.env.API_CONTACT_URL || 'craffel.de';

/**
 * @constant {string} API_CONTACT_EMAIL
 * API contact email for documentation. Defaults to 'martin.rosbund@gmail.com'.
 */
export const API_CONTACT_EMAIL: string = process.env.API_CONTACT_EMAIL || 'martin.rosbund@gmail.com';
