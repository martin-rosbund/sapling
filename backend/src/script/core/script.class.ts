import { ScriptInterface } from './script.interface.js';
import { EntityItem } from '../../entity/EntityItem.js';
import { ScriptResultClient } from './script.result.client.js';
import { ScriptResultServer } from './script.result.server.js';
import { PersonItem } from '../../entity/PersonItem.js';

// #region Enum
/**
 * @class
 * @abstract
 * @implements      {ScriptInterface}
 * @version         1.0
 * @author          Martin Rosbund, ChatGPT
 * @summary         Abstract base class providing all required methods for API authorization and queries.
 *
 * @property        {EntityItem}      entity      The entity associated with the script
 * @property        {PersonItem}      user        The user executing the script
 */
export abstract class ScriptClass implements ScriptInterface {
  // #region Properties
  /**
   * The entity associated with the script instance.
   * @type {EntityItem}
   */
  public entity: EntityItem;
  /**
   * The user executing the script instance.
   * @type {PersonItem}
   */
  public user: PersonItem;
  // #endregion

  // #region Constructor
  /**
   * Creates a new instance of the ScriptClass.
   *
   * @param {EntityItem} entity - The entity associated with the script.
   * @param {PersonItem} user - The user executing the script.
   */
  constructor(entity: EntityItem, user: PersonItem) {
    this.entity = entity;
    this.user = user;
  }
  // #endregion

  // #region Abstract Methods
  /**
   * Executes the main script logic for the client.
   *
   * @param {object[]} items - The selected data records.
   * @returns {Promise<ScriptResultClient>} The result of the client script execution.
   */
  async execute(items: object[]): Promise<ScriptResultClient> {
    await this.sleep(0);
    const result = new ScriptResultClient();
    result.item = items[0] || {};
    //global.log.trace(
    //  `scriptClass - execute - ${this.entity.handle} - count items ${items.length}`,
    //);
    return result;
  }

  /**
   * Event triggered before records are loaded (open operation).
   *
   * @param {object[]} items - The records to be loaded.
   * @returns {Promise<ScriptResultServer>} The result of the before read event.
   */
  async beforeRead(items: object[]): Promise<ScriptResultServer> {
    await this.sleep(0);
    //global.log.trace(
    //  `scriptClass - beforeRead - ${this.entity.handle} - count items ${items.length}`,
    //);
    return new ScriptResultServer(items);
  }

  /**
   * Event triggered after records are loaded (open operation).
   *
   * @param {object[]} items - The records that have been loaded.
   * @returns {Promise<ScriptResultServer>} The result of the after read event.
   */
  async afterRead(items: object[]): Promise<ScriptResultServer> {
    await this.sleep(0);
    //global.log.trace(
    //  `scriptClass - afterRead - ${this.entity.handle} - count items ${items.length}`,
    //);
    return new ScriptResultServer(items);
  }

  /**
   * Event triggered before new records are inserted.
   *
   * @param {object[]} items - The new records to be inserted.
   * @returns {Promise<ScriptResultServer>} The result of the before insert event.
   */
  async beforeInsert(items: object[]): Promise<ScriptResultServer> {
    await this.sleep(0);
    //global.log.trace(
    //  `scriptClass - beforeInsert - ${this.entity.handle} - count items ${items.length}`,
    //);
    return new ScriptResultServer(items);
  }

  /**
   * Event triggered after new records are inserted.
   *
   * @param {object[]} items - The new records that have been inserted.
   * @returns {Promise<ScriptResultServer>} The result of the after insert event.
   */
  async afterInsert(items: object[]): Promise<ScriptResultServer> {
    await this.sleep(0);
    //global.log.trace(
    //  `scriptClass - afterInsert - ${this.entity.handle} - count items ${items.length}`,
    //);
    return new ScriptResultServer(items);
  }

  /**
   * Event triggered before records are updated.
   *
   * @param {object[]} items - The records to be updated.
   * @returns {Promise<ScriptResultServer>} The result of the before update event.
   */
  async beforeUpdate(items: object[]): Promise<ScriptResultServer> {
    await this.sleep(0);
    //global.log.trace(
    //  `scriptClass - beforeUpdate - ${this.entity.handle} - count items ${items.length}`,
    //);
    return new ScriptResultServer(items);
  }

  /**
   * Event triggered after records are updated.
   *
   * @param {object[]} items - The records that have been updated.
   * @returns {Promise<ScriptResultServer>} The result of the after update event.
   */
  async afterUpdate(items: object[]): Promise<ScriptResultServer> {
    await this.sleep(0);
    //global.log.trace(
    //  `scriptClass - afterUpdate - ${this.entity.handle} - count items ${items.length}`,
    //);
    return new ScriptResultServer(items);
  }

  /**
   * Event triggered before records are deleted.
   *
   * @param {object[]} items - The records to be deleted.
   * @returns {Promise<ScriptResultServer>} The result of the before delete event.
   */
  async beforeDelete(items: object[]): Promise<ScriptResultServer> {
    await this.sleep(0);
    //global.log.trace(
    //  `scriptClass - beforeDelete - ${this.entity.handle} - count items ${items.length}`,
    //);
    return new ScriptResultServer(items);
  }

  /**
   * Event triggered after records are deleted.
   *
   * @param {object[]} items - The records that have been deleted.
   * @returns {Promise<ScriptResultServer>} The result of the after delete event.
   */
  async afterDelete(items: object[]): Promise<ScriptResultServer> {
    await this.sleep(0);
    //global.log.trace(
    //  `scriptClass - afterDelete - ${this.entity.handle} - count items ${items.length}`,
    //);
    return new ScriptResultServer(items);
  }
  // #endregion

  // #region Helper Methods
  /**
   * Helper function to pause execution for a given number of milliseconds.
   *
   * @param {number} ms - The number of milliseconds to sleep.
   * @returns {Promise<void>} A promise that resolves after the specified time.
   */
  public async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
  // #endregion
}
