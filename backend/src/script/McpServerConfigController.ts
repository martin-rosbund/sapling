import { EntityItem } from '../entity/EntityItem.js';
import { PersonItem } from '../entity/PersonItem.js';
import type { EntityManager } from '@mikro-orm/core';
import { ScriptClass } from './core/script.class.js';
import {
  ScriptResultServer,
  ScriptResultServerMethods,
} from './core/script.result.server.js';
import { McpServerConfigItem } from '../entity/McpServerConfigItem.js';

/**
 * Controller for Note entity scripts.
 * Extends the ScriptClass to provide custom logic for Note operations.
 */
export class McpServerConfigController extends ScriptClass {
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
    items: McpServerConfigItem[],
  ): Promise<ScriptResultServer> {
    this.logDebug('beforeUpdate', 'Starting MCP server config cleanup', {
      itemCount: items.length,
    });
    await this.sleep(0);

    if (items && items.length > 0) {
      for (const item of items) {
        this.logTrace('beforeUpdate', 'Inspecting MCP server config', {
          configHandle: item.handle,
          hasEnvironment: item.environment != null,
          hasAuthConfig: item.authConfig != null,
        });

        if (item.environment == null) {
          delete item.environment;
          this.logInfo(
            'beforeUpdate',
            'Removed empty environment configuration',
            {
              configHandle: item.handle,
            },
          );
        }

        if (item.authConfig == null) {
          delete item.authConfig;
          this.logInfo('beforeUpdate', 'Removed empty auth configuration', {
            configHandle: item.handle,
          });
        }
      }
    }

    this.logDebug('beforeUpdate', 'Completed MCP server config cleanup', {
      itemCount: items.length,
    });

    return new ScriptResultServer(items, ScriptResultServerMethods.overwrite);
  }
}
