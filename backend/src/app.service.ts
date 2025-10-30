import { Injectable } from '@nestjs/common';

/**
 * Application service providing app-level logic and utilities.
 */
@Injectable()
export class AppService {
  /**
   * Returns the current application version from package.json.
   * @returns {string} The version string.
   */
  getVersion(): { version: string } {
    return { version: '1.0.0' };
  }
}
