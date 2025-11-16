import { ScriptInterface } from './script.interface.js';
import { EntityItem } from '../../entity/EntityItem.js';
import path from 'path';
import * as fs from 'fs';
import { ScriptResultClient } from './script.result.client.js';
import { ScriptResultServer } from './script.result.server.js';
import { performance } from 'perf_hooks';
import { PersonItem } from '../../entity/PersonItem.js';

// #region Enum
/**
 * Enum representing the available script lifecycle methods.
 * Used to identify which script event should be executed.
 */
export enum ScriptMethods {
  beforeRead,
  afterRead,
  beforeUpdate,
  afterUpdate,
  beforeInsert,
  afterInsert,
  beforeDelete,
  afterDelete,
}
// #endregion

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
    global.log.trace(
      `scriptClass - execute - ${this.entity.handle} - count items ${items.length}`,
    );
    return new ScriptResultClient();
  }

  /**
   * Event triggered before records are loaded (open operation).
   *
   * @param {object[]} items - The records to be loaded.
   * @returns {Promise<ScriptResultServer>} The result of the before read event.
   */
  async beforeRead(items: object[]): Promise<ScriptResultServer> {
    await this.sleep(0);
    global.log.trace(
      `scriptClass - beforeRead - ${this.entity.handle} - count items ${items.length}`,
    );
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
    global.log.trace(
      `scriptClass - afterRead - ${this.entity.handle} - count items ${items.length}`,
    );
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
    global.log.trace(
      `scriptClass - beforeInsert - ${this.entity.handle} - count items ${items.length}`,
    );
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
    global.log.trace(
      `scriptClass - afterInsert - ${this.entity.handle} - count items ${items.length}`,
    );
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
    global.log.trace(
      `scriptClass - beforeUpdate - ${this.entity.handle} - count items ${items.length}`,
    );
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
    global.log.trace(
      `scriptClass - afterUpdate - ${this.entity.handle} - count items ${items.length}`,
    );
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
    global.log.trace(
      `scriptClass - beforeDelete - ${this.entity.handle} - count items ${items.length}`,
    );
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
    global.log.trace(
      `scriptClass - afterDelete - ${this.entity.handle} - count items ${items.length}`,
    );
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
  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
  // #endregion

  // #region Dynamic Loader
  /**
   * Dynamically loads the script class based on the entity handle.
   *
   * @param {EntityItem} entity - The entity for which to load the script controller.
   * @param {PersonItem} user - The user executing the script.
   * @returns {Promise<ScriptClass | null>} The loaded script class instance, or null if not found.
   */
  public static async dynamicLoader(
    entity: EntityItem,
    user: PersonItem,
  ): Promise<ScriptClass | null> {
    const entityName =
      entity.handle.charAt(0).toUpperCase() + entity.handle.slice(1);
    const entityPath = `../${entityName}Controller.js`;

    if (fs.existsSync(path.join(__dirname, entityPath))) {
      global.log.info(
        `scriptClass - dynamicLoader - ${entityName} - ${entityName} - ${entityPath} loaded`,
      );
      const entityController = (await import(entityPath)) as Record<
        string,
        unknown
      >;
      const ControllerClass = entityController[`${entityName}Controller`] as {
        new (entity: EntityItem, user: PersonItem): ScriptClass;
      };
      return new ControllerClass(entity, user);
    }

    return null;
  }
  // #endregion

  // #region Runner
  /**
   * Executes the client-side script logic for the given entity and user.
   *
   * @param {object | object[]} items - The selected data records.
   * @param {EntityItem} entity - The entity for which the script is executed.
   * @param {PersonItem} user - The user executing the script.
   * @returns {Promise<ScriptResultClient>} The result of the client script execution.
   */
  public static async runClient(
    items: object | object[],
    entity: EntityItem,
    user: PersonItem,
  ): Promise<ScriptResultClient> {
    const startTime = performance.now();
    let result: ScriptResultClient | null = null;

    try {
      const entityClass = await ScriptClass.dynamicLoader(entity, user);

      if (entityClass) {
        global.log.info(`scriptClass - runClient - ${entity.handle}`);
        if (typeof entityClass.execute === 'function') {
          result = await entityClass.execute(
            Array.isArray(items)
              ? (items as object[] & number)
              : ([items] as object[] & number),
          );

          if (user) {
            const executionTime = (performance.now() - startTime) / 1000;
            global.log.debug(
              `execution time: ${executionTime.toFixed(6)}s (script execute for entity ${entity.handle})`,
            );
          }
        }
      }

      global.log.trace(`scriptClass - runClient - ${entity.handle} - skipped`);
    } catch (e) {
      global.log.error(e);
    } finally {
      if (!result) {
        result = new ScriptResultClient();
      }
    }

    return result;
  }

  /**
   * Executes the server-side script logic for the given method, entity, and user.
   *
   * @param {ScriptMethods} method - The script lifecycle method to execute.
   * @param {object | object[]} items - The selected data records.
   * @param {EntityItem} entity - The entity for which the script is executed.
   * @param {PersonItem} user - The user executing the script.
   * @returns {Promise<ScriptResultServer>} The result of the server script execution.
   */
  public static async runServer(
    method: ScriptMethods,
    items: object | object[],
    entity: EntityItem,
    user: PersonItem,
  ): Promise<ScriptResultServer> {
    const startTime = performance.now();
    let result: ScriptResultServer | null = null;
    try {
      const entityClass = await ScriptClass.dynamicLoader(entity, user);

      if (entityClass) {
        global.log.info(
          `scriptClass - runServer - ${entity.handle} - ${ScriptMethods[method]}- execute`,
        );
        const methodName = ScriptMethods[method] as keyof ScriptClass;
        if (typeof entityClass[methodName] === 'function') {
          result = await (entityClass[methodName](
            Array.isArray(items)
              ? (items as object[] & number)
              : ([items] as object[] & number),
          ) as Promise<ScriptResultServer | null>);
        }
      }

      global.log.trace(
        `scriptClass - runServer - ${entity.handle} - ${ScriptMethods[method]} - skipped`,
      );

      if (user) {
        const executionTime = (performance.now() - startTime) / 1000;
        global.log.debug(
          `execution time: ${executionTime.toFixed(6)}s (script ${ScriptMethods[method]} for entity ${entity.handle})`,
        );
      }
    } catch (e) {
      global.log.error(e);
    } finally {
      if (!result) {
        result = new ScriptResultServer(
          Array.isArray(items) ? (items as object[]) : ([items] as object[]),
        );
      }
    }

    return result;
  }
  // #endregion
}
