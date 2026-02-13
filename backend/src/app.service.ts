import { Injectable } from '@nestjs/common';

export type VersionItem = { version: string };
/**
 * Application service providing app-level logic and utilities.
 */
@Injectable()
export class AppService {
  /**
   * Echo service for testing purposes.
   * @param {any} item - The item to echo back.
   * @returns {any} The same item that was passed in.
   */
  getEcho(item: any): any {
    return item;
  }
}
