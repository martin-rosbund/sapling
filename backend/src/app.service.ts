import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

export type VersionItem = { version: string };
/**
 * Application service providing app-level logic and utilities.
 */
@Injectable()
export class AppService {
  /**
   * Returns the current application version from package.json.
   * @returns {string} The version string.
   */
  getVersion(): VersionItem {
    const packageJsonPath = join(__dirname, '../package.json');
    const fileContent = readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(fileContent) as Partial<{ version: string }>;

    return { version: packageJson.version ? packageJson.version : '0.0.0' };
  }

  /**
   * Echo service for testing purposes.
   * @param {any} item - The item to echo back.
   * @returns {any} The same item that was passed in.
   */
  getEcho(item: any): any {
    return item;
  }
}
