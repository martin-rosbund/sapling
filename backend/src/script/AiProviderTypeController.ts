import { EntityItem } from '../entity/EntityItem.js';
import { PersonItem } from '../entity/PersonItem.js';
import type { EntityManager } from '@mikro-orm/core';
import { ScriptClass } from './core/script.class.js';
import {
  ScriptResultServer,
  ScriptResultServerMethods,
} from './core/script.result.server.js';
import { AiProviderTypeItem } from '../entity/AiProviderTypeItem.js';

/**
 * Controller for Note entity scripts.
 * Extends the ScriptClass to provide custom logic for Note operations.
 */
export class AiProviderTypeController extends ScriptClass {
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
  async beforeUpdate(items: AiProviderTypeItem[]): Promise<ScriptResultServer> {
    this.logDebug('beforeUpdate', 'Starting credentials cleanup', {
      itemCount: items.length,
    });
    await this.sleep(0);

    if (items && items.length > 0) {
      for (const item of items) {
        this.logTrace('beforeUpdate', 'Inspecting provider credentials', {
          providerHandle: item.handle,
          hasCredentials: item.credentials != null,
        });

        if (item.credentials == null) {
          delete item.credentials;
          this.logInfo('beforeUpdate', 'Removed empty credentials payload', {
            providerHandle: item.handle,
          });
          continue;
        }

        this.logDebug('beforeUpdate', 'Keeping existing credentials payload', {
          providerHandle: item.handle,
        });
      }
    }

    this.logDebug('beforeUpdate', 'Completed credentials cleanup', {
      itemCount: items.length,
    });

    return new ScriptResultServer(items, ScriptResultServerMethods.overwrite);
  }
}
