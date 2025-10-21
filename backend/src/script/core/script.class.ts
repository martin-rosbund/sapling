import { ScriptInterface } from './script.interface.js';
import { EntityItem } from '../../entity/EntityItem.js';
import path from 'path';
import * as fs from 'fs';
import { ScriptResultClient } from './script.result.client.js';
import { ScriptResultServer } from './script.result.server.js';
import { performance } from 'perf_hooks';
import { PersonItem } from '../../entity/PersonItem.js';

//#region Enum
export enum ScriptMethods {
  beforeOpen,
  afterOpen,
  beforeUpdate,
  afterUpdate,
  beforeInsert,
  afterInsert,
  beforeDelete,
  afterDelete,
}
//#endregion

/**
 * @class
 * @abstract
 * @implements      {connectionInterface}
 * @version         1.0
 * @author          Martin Rosbund, ChatGPT
 * @summary         Abstrakte Klasse mit allen benötigen Methoden für eine API Authorisierung und Abfragen.
 *
 * @property        {EntityItem}      entity              Entität
 * @property        {PersonItem}      user                Benutzer
 */
export abstract class ScriptClass implements ScriptInterface {
  //#region Property
  public entity: EntityItem;
  public user: PersonItem;
  //#endregion

  //#region Construct
  /**
   * @constructor
   * @author          Martin Rosbund
   * @summary         Neue Instanz der Klasse
   *
   * @param        {EntityItem}           entity              Entität
   * @param        {PersonItem}           user                Benutzer
   */
  constructor(entity: EntityItem, user: PersonItem) {
    this.entity = entity;
    this.user = user;
  }
  //#endregion

  //#region Abstract
  async execute(items: object[]): Promise<ScriptResultClient> {
    await this.sleep(0);
    global.log.trace(
      `scriptClass - execute - ${this.entity.handle} - count items ${items.length}`,
    );
    return new ScriptResultClient();
  }

  async beforeOpen(items: object[]): Promise<ScriptResultServer> {
    await this.sleep(0);
    global.log.trace(
      `scriptClass - beforeOpen - ${this.entity.handle} - count items ${items.length}`,
    );
    return new ScriptResultServer(items);
  }

  async afterOpen(items: object[]): Promise<ScriptResultServer> {
    await this.sleep(0);
    global.log.trace(
      `scriptClass - afterOpen - ${this.entity.handle} - count items ${items.length}`,
    );
    return new ScriptResultServer(items);
  }

  async beforeInsert(items: object[]): Promise<ScriptResultServer> {
    await this.sleep(0);
    global.log.trace(
      `scriptClass - beforeInsert - ${this.entity.handle} - count items ${items.length}`,
    );
    return new ScriptResultServer(items);
  }

  async afterInsert(items: object[]): Promise<ScriptResultServer> {
    await this.sleep(0);
    global.log.trace(
      `scriptClass - afterInsert - ${this.entity.handle} - count items ${items.length}`,
    );
    return new ScriptResultServer(items);
  }

  async beforeUpdate(items: object[]): Promise<ScriptResultServer> {
    await this.sleep(0);
    global.log.trace(
      `scriptClass - beforeUpdate - ${this.entity.handle} - count items ${items.length}`,
    );
    return new ScriptResultServer(items);
  }

  async afterUpdate(items: object[]): Promise<ScriptResultServer> {
    await this.sleep(0);
    global.log.trace(
      `scriptClass - afterUpdate - ${this.entity.handle} - count items ${items.length}`,
    );
    return new ScriptResultServer(items);
  }

  async beforeDelete(items: object[]): Promise<ScriptResultServer> {
    await this.sleep(0);
    global.log.trace(
      `scriptClass - beforeDelete - ${this.entity.handle} - count items ${items.length}`,
    );
    return new ScriptResultServer(items);
  }

  async afterDelete(items: object[]): Promise<ScriptResultServer> {
    await this.sleep(0);
    global.log.trace(
      `scriptClass - afterDelete - ${this.entity.handle} - count items ${items.length}`,
    );
    return new ScriptResultServer(items);
  }
  //#endregion

  //#region Helper
  sleep(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
  //#endregion

  //#region Dynamic Loader
  /**
   * @method
   * @summary Dynamisches Laden der Skriptklasse anhand des Entitäts-Handles
   *
   * @param   {string}  entityHandle      Entitäts-Handle
   * @param   {PersonItem} user
   *
   * @returns {Promise<ScriptClass>} Entität
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
  //#endregion

  //#region Runner
  /**
   * @method
   * @summary Führt die execute Methode für den Client aus.
   *
   * @param   {object[]}           items           Selektierte Datensätze
   * @param   {string}             entityHandle    Entitäts-Handle
   * @param   {number}             scriptHandle    Skript-Handle
   * @param   {PersonItem}         user            Benutzer
   *
   * @returns {Promise<ScriptResultClient>} Aktion
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
        }
      }

      global.log.trace(`scriptClass - runClient - ${entity.handle} - skipped`);
    } catch (e) {
      global.log.error(e);
    } finally {
      if (!result) {
        result = new ScriptResultClient();
      }

      if (user) {
        const executionTime = (performance.now() - startTime) / 1000;
        global.log.debug(
          `execution time: ${executionTime.toFixed(6)}s (script execute for entity ${entity.handle})`,
        );
      }
    }

    return result;
  }

  /**
   * @method
   * @summary Führt die execute Methode für den Server aus.
   *
   * @param   {ScriptMethods}      method          Methode
   * @param   {object | object[]}  items           Selektierte Datensätze
   * @param   {string}             entityHandle    Entitäts-Handle
   * @param   {PersonItem}         user            Benutzer
   *
   * @returns {Promise<ScriptResultServer>} Aktion
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
    } catch (e) {
      global.log.error(e);
    } finally {
      if (!result) {
        result = new ScriptResultServer(
          Array.isArray(items) ? (items as object[]) : ([items] as object[]),
        );
      }

      if (user) {
        const executionTime = (performance.now() - startTime) / 1000;
        global.log.debug(
          `execution time: ${executionTime.toFixed(6)}s (script ${ScriptMethods[method]} for entity ${entity.handle})`,
        );
      }
    }

    return result;
  }
  //#endregion
}
