import { EntityItem } from '../../entity/EntityItem.js';
import path from 'path';
import * as fs from 'fs';
import { ScriptResultClient } from './script.result.client.js';
import { ScriptResultServer } from './script.result.server.js';
import { performance } from 'perf_hooks';
import { PersonItem } from '../../entity/PersonItem.js';
import { ScriptClass } from './script.class.js';
import { EntityManager } from '@mikro-orm/mysql';
import { Injectable } from '@nestjs/common';
import { WebhookService } from '../../api/webhook/webhook.service.js';
import { WebhookSubscriptionItem } from '../../entity/WebhookSubscriptionItem.js';

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
@Injectable()
export class ScriptService {
  // #region Constructor
  constructor(
    private readonly em: EntityManager,
    private readonly webhookService: WebhookService,
  ) {}
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
        `scriptService - dynamicLoader - ${entityName} - ${entityName} - ${entityPath} loaded`,
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

  // #region Runner Client
  /**
   * Executes the client-side script logic for the given entity and user.
   *
   * @param {object | object[]} items - The selected data records.
   * @param {EntityItem} entity - The entity for which the script is executed.
   * @param {PersonItem} user - The user executing the script.
   * @returns {Promise<ScriptResultClient>} The result of the client script execution.
   */
  public async runClient(
    items: object | object[],
    entity: EntityItem,
    user: PersonItem,
  ): Promise<ScriptResultClient> {
    return await this.runClientMethod(items, entity, user);
  }

  /**
   * Executes the client-side script logic for the given entity and user.
   *
   * @param {object | object[]} items - The selected data records.
   * @param {EntityItem} entity - The entity for which the script is executed.
   * @param {PersonItem} user - The user executing the script.
   * @returns {Promise<ScriptResultClient>} The result of the client script execution.
   */
  protected async runClientMethod(
    items: object | object[],
    entity: EntityItem,
    user: PersonItem,
  ): Promise<ScriptResultClient> {
    const startTime = performance.now();
    let result: ScriptResultClient | null = null;

    try {
      const entityClass = await ScriptService.dynamicLoader(entity, user);

      if (entityClass) {
        global.log.info(`scriptService - runClient - ${entity.handle}`);
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

      global.log.trace(
        `scriptService - runClient - ${entity.handle} - skipped`,
      );
    } catch (e) {
      global.log.error(e);
    } finally {
      if (!result) {
        result = new ScriptResultClient();
      }
    }

    return result;
  }
  // #endregion

  // #region Runner Server
  /**
   * Executes the server-side script logic for the given method, entity, and user.
   *
   * @param {ScriptMethods} method - The script lifecycle method to execute.
   * @param {object | object[]} items - The selected data records.
   * @param {EntityItem} entity - The entity for which the script is executed.
   * @param {PersonItem} user - The user executing the script.
   * @returns {Promise<ScriptResultServer>} The result of the server script execution.
   */
  public async runServer(
    method: ScriptMethods,
    items: object | object[],
    entity: EntityItem,
    user: PersonItem,
  ): Promise<ScriptResultServer> {
    if (!(await this.runSubscription(method, items, entity, user))) {
      global.log.warn(
        `scriptService - runServer - ${entity.handle} - ${ScriptMethods[method]} - subscription failed`,
      );
    }

    return await this.runServerMethod(method, items, entity, user);
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
  public async runServerMethod(
    method: ScriptMethods,
    items: object | object[],
    entity: EntityItem,
    user: PersonItem,
  ): Promise<ScriptResultServer> {
    const startTime = performance.now();
    let result: ScriptResultServer | null = null;
    try {
      const entityClass = await ScriptService.dynamicLoader(entity, user);

      if (entityClass) {
        global.log.info(
          `scriptService - runServer - ${entity.handle} - ${ScriptMethods[method]}- execute`,
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
        `scriptService - runServer - ${entity.handle} - ${ScriptMethods[method]} - skipped`,
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

  // #region Webhook Runner
  /**
   * Runs webhook subscriptions for the given entity and method.
   *
   * @param {ScriptMethods} method - The script lifecycle method to execute.
   * @param {object | object[]} items - The selected data records.
   * @param {EntityItem} entity - The entity for which the script is executed.
   * @param {PersonItem} user - The user executing the script.
   * @returns {Promise<ScriptResultServer>} The result of the server script execution.
   */
  public async runSubscription(
    method: ScriptMethods,
    items: object | object[],
    entity: EntityItem,
    user: PersonItem,
  ): Promise<boolean> {
    const startTime = performance.now();
    let result: boolean = true;
    try {
      if (method > ScriptMethods.afterRead) {
        const subscriptions = await this.em.findAll(WebhookSubscriptionItem, {
          where: {
            entity: { handle: entity.handle },
            type: { handle: ScriptMethods[method] },
            isActive: true,
          },
        });

        if (subscriptions.length > 0) {
          for (const subscription of subscriptions) {
            if (subscription?.handle) {
              global.log.info(
                `Processing subscription: ${subscription.handle}`,
              );
              await this.webhookService.triggerSubscription(
                subscription.handle,
                Array.isArray(items) ? items : [items],
              );
            }
          }

          if (user) {
            const executionTime = (performance.now() - startTime) / 1000;
            global.log.debug(
              `execution time: ${executionTime.toFixed(6)}s (script ${ScriptMethods[method]} for entity ${entity.handle})`,
            );
          }
        }
      }
    } catch (e) {
      global.log.error(e);
      result = false;
    }

    return result;
  }
  // #endregion
}
