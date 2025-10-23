import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Application service providing app-level logic and utilities.
 */
@Injectable()
export class AppService {
  /**
   * Returns the current application version from package.json.
   * @returns {string} The version string.
   */
  getVersion(): string {
    // Read package.json synchronously and parse version
    const packageJsonPath = join(__dirname, '..', 'package.json');
    const fileContent = readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(fileContent) as { version: string };
    return packageJson.version;
  }
}
