import { readFileSync } from 'fs';
import { join } from 'path';
import { DB_DATA_SEEDER } from '../../../constants/project.constants';

/**
 * Resolves the seeder data directory for the active DB_DATA_SEEDER mode
 * (e.g. `production` or `demonstration`).
 *
 * The path is relative to the compiled seeder folder and follows the
 * convention `json-{env}/{fileBase}.json` used by all seeders.
 */
export function resolveSeedJsonPath(fileBase: string): string {
  return join(__dirname, '..', `json-${DB_DATA_SEEDER}`, `${fileBase}.json`);
}

/**
 * Loads and parses a JSON seed file for the active DB_DATA_SEEDER mode.
 *
 * @param fileBase Base path relative to the env-specific seeder folder
 *                 (without `.json` extension).
 * @returns Parsed array of seed records.
 */
export function loadSeedJson<T>(fileBase: string): T[] {
  const jsonPath = resolveSeedJsonPath(fileBase);
  const fileContent = readFileSync(jsonPath, 'utf-8');
  return JSON.parse(fileContent) as T[];
}
