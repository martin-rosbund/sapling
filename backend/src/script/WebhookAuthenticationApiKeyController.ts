import { EntityItem } from '../entity/EntityItem.js';
import { PersonItem } from '../entity/PersonItem.js';
import type { EntityManager } from '@mikro-orm/core';
import { ScriptClass } from './core/script.class.js';
import {
  ScriptResultServer,
  ScriptResultServerMethods,
} from './core/script.result.server.js';
import { WebhookAuthenticationApiKeyItem } from '../entity/WebhookAuthenticationApiKeyItem.js';

/**
 * Controller for Note entity scripts.
 * Extends the ScriptClass to provide custom logic for Note operations.
 */
export class WebhookAuthenticationApiKeyController extends ScriptClass {
  /**
   * Creates a new instance of NoteController.
   *
   * @param {EntityItem} entity - The entity associated with the script.
   * @param {PersonItem} user - The user executing the script.
   */
  constructor(entity: EntityItem, user: PersonItem, em?: EntityManager) {
    super(entity, user, em);
  }

  /**
   * Event triggered before new Note records are inserted.
   * Sets the person property of each note to the current user's handle.
   *
   * @param {EventItem[]} items - The new Event records to be inserted.
   * @returns {Promise<ScriptResultServer>} The result of the before insert event.
   */
  async beforeUpdate(
    items: WebhookAuthenticationApiKeyItem[],
  ): Promise<ScriptResultServer> {
    this.logDebug('beforeUpdate', 'Starting webhook API key cleanup', {
      itemCount: items.length,
    });
    await this.sleep(0);

    if (items && items.length > 0) {
      for (const item of items) {
        this.logTrace('beforeUpdate', 'Inspecting webhook API key entry', {
          authenticationHandle: item.handle,
          hasApiKey: item.apiKey != null && item.apiKey !== '',
        });

        if (item.apiKey == '' || item.apiKey == null) {
          delete item.apiKey;
          this.logInfo('beforeUpdate', 'Removed empty API key field', {
            authenticationHandle: item.handle,
          });
          continue;
        }

        this.logDebug('beforeUpdate', 'Keeping existing API key field', {
          authenticationHandle: item.handle,
        });
      }
    }

    this.logDebug('beforeUpdate', 'Completed webhook API key cleanup', {
      itemCount: items.length,
    });

    return new ScriptResultServer(items, ScriptResultServerMethods.overwrite);
  }
}
