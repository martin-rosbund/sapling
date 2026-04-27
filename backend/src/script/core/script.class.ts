import type { ScriptInterface, ScriptServerContext } from './script.interface';
import type { AzureCalendarService } from '../../calendar/azure/azure.calendar.service';
import type { GoogleCalendarService } from '../../calendar/google/google.calendar.service';
import type { MailService } from '../../api/mail/mail.service';
import type { WebhookService } from '../../api/webhook/webhook.service';
import type { EventDeliveryService } from '../../calendar/event.delivery.service';
import type { EntityManager } from '@mikro-orm/core';
import { EntityItem } from '../../entity/EntityItem.js';
import { ScriptResultClient } from './script.result.client.js';
import { ScriptResultServer } from './script.result.server.js';
import { PersonItem } from '../../entity/PersonItem.js';

type ScriptLogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

// #region Enum
/**
 * @class
 * @abstract
 * @implements      {ScriptInterface}
 * @version         1.0
 * @author          Martin Rosbund
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
  /**
   * Calendar services (DI)
   */
  public em?: EntityManager;
  public azureCalendarService?: AzureCalendarService;
  public googleCalendarService?: GoogleCalendarService;
  public mailService?: MailService;
  public webhookService?: WebhookService;
  public eventDeliveryService?: EventDeliveryService;
  // #endregion

  // #region Constructor
  /**
   * Creates a new instance of the ScriptClass.
   *
   * @param {EntityItem} entity - The entity associated with the script.
   * @param {PersonItem} user - The user executing the script.
   */
  constructor(
    entity: EntityItem,
    user: PersonItem,
    em?: EntityManager,
    azureCalendarService?: AzureCalendarService,
    googleCalendarService?: GoogleCalendarService,
    mailService?: MailService,
    webhookService?: WebhookService,
    eventDeliveryService?: EventDeliveryService,
  ) {
    this.entity = entity;
    this.user = user;
    this.em = em;
    this.azureCalendarService = azureCalendarService;
    this.googleCalendarService = googleCalendarService;
    this.mailService = mailService;
    this.webhookService = webhookService;
    this.eventDeliveryService = eventDeliveryService;
  }
  // #endregion

  // #region Abstract Methods
  /**
   * Executes the main script logic for the client.
   *
   * @param {object[]} items - The selected data records.
   * @param {string} name - The entity-specific script action name.
   * @param {unknown} parameter - Optional parameter payload for the action.
   * @returns {Promise<ScriptResultClient>} The result of the client script execution.
   */
  async execute(
    items: object[],
    name: string,
    parameter?: unknown,
  ): Promise<ScriptResultClient> {
    await this.sleep(0);
    const result = new ScriptResultClient();
    result.item = items[0] || {};
    void name;
    void parameter;
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
  async beforeRead(
    items: object[],
    context?: ScriptServerContext,
  ): Promise<ScriptResultServer> {
    await this.sleep(0);
    void context;
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
  async afterRead(
    items: object[],
    context?: ScriptServerContext,
  ): Promise<ScriptResultServer> {
    await this.sleep(0);
    void context;
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
  async beforeInsert(
    items: object[],
    context?: ScriptServerContext,
  ): Promise<ScriptResultServer> {
    await this.sleep(0);
    void context;
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
  async afterInsert(
    items: object[],
    context?: ScriptServerContext,
  ): Promise<ScriptResultServer> {
    await this.sleep(0);
    void context;
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
  async beforeUpdate(
    items: object[],
    context?: ScriptServerContext,
  ): Promise<ScriptResultServer> {
    await this.sleep(0);
    void context;
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
  async afterUpdate(
    items: object[],
    context?: ScriptServerContext,
  ): Promise<ScriptResultServer> {
    await this.sleep(0);
    void context;
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
  async beforeDelete(
    items: object[],
    context?: ScriptServerContext,
  ): Promise<ScriptResultServer> {
    await this.sleep(0);
    void context;
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
  async afterDelete(
    items: object[],
    context?: ScriptServerContext,
  ): Promise<ScriptResultServer> {
    await this.sleep(0);
    void context;
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

  protected logTrace(
    operation: string,
    message: string,
    context?: Record<string, unknown>,
  ) {
    this.logMessage('trace', operation, message, context);
  }

  protected logDebug(
    operation: string,
    message: string,
    context?: Record<string, unknown>,
  ) {
    this.logMessage('debug', operation, message, context);
  }

  protected logInfo(
    operation: string,
    message: string,
    context?: Record<string, unknown>,
  ) {
    this.logMessage('info', operation, message, context);
  }

  protected logWarn(
    operation: string,
    message: string,
    context?: Record<string, unknown>,
  ) {
    this.logMessage('warn', operation, message, context);
  }

  protected logError(
    operation: string,
    message: string,
    context?: Record<string, unknown>,
  ) {
    this.logMessage('error', operation, message, context);
  }

  private logMessage(
    level: ScriptLogLevel,
    operation: string,
    message: string,
    context?: Record<string, unknown>,
  ) {
    const logger = global.log as
      | Partial<Record<ScriptLogLevel, (value: string) => void>>
      | undefined;
    const target = logger?.[level];

    if (typeof target !== 'function') {
      return;
    }

    const baseContext: Record<string, unknown> = {
      userHandle: this.user?.handle ?? 'unknown',
      ...(context ?? {}),
    };
    const formattedContext = this.formatLogContext(baseContext);

    target.call(
      logger,
      `scriptController - ${this.entity.handle} - ${operation} - ${message}${formattedContext}`,
    );
  }

  private formatLogContext(context?: Record<string, unknown>): string {
    if (!context) {
      return '';
    }

    const entries = Object.entries(context).filter(
      ([, value]) => typeof value !== 'undefined',
    );

    if (entries.length === 0) {
      return '';
    }

    return ` | ${entries
      .map(([key, value]) => `${key}=${this.formatLogValue(value)}`)
      .join(', ')}`;
  }

  private formatLogValue(value: unknown): string {
    if (value == null) {
      return String(value);
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return `[${value.map((entry) => this.formatLogValue(entry)).join(', ')}]`;
    }

    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;

      if (
        'handle' in record &&
        (typeof record.handle === 'string' || typeof record.handle === 'number')
      ) {
        return `{handle:${String(record.handle)}}`;
      }

      if ('length' in record && typeof record.length === 'number') {
        return `{length:${String(record.length)}}`;
      }

      try {
        return JSON.stringify(value);
      } catch {
        return '[object]';
      }
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    ) {
      return String(value);
    }

    if (typeof value === 'symbol') {
      return value.toString();
    }

    if (typeof value === 'function') {
      return `[function ${value.name || 'anonymous'}]`;
    }

    return '[unknown]';
  }
  // #endregion
}
