import { Injectable } from '@nestjs/common';

/**
 * @typedef VersionItem
 * @property {string} version - Application version string
 */
export type VersionItem = { version: string };

/**
 * @class AppService
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Application service providing app-level logic and utilities.
 *
 * @method          getEcho(item: any): any     Echo service for testing purposes
 */
@Injectable()
export class AppService {
  // #region Methods: Service Logic
  /**
   * Echo service for testing purposes.
   * Returns the item passed in, unchanged.
   * @param {any} item - The item to echo back.
   * @returns {any} The same item that was passed in.
   */
  getEcho(item: any): any {
    return item;
  }
  // #endregion
}
