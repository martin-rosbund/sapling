import { Injectable } from '@nestjs/common';
import { SAPLING_VERSION } from './constants/project.constants';

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
    return { version: SAPLING_VERSION };
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
