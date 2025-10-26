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
  getVersion(): string {
    return "1.0.0";
  }
}
