import { TicketItem } from '../entity/TicketItem.js';
import { EntityItem } from '../entity/EntityItem.js';
import { PersonItem } from '../entity/PersonItem.js';
import type { EntityManager } from '@mikro-orm/core';
import { ScriptClass } from './core/script.class.js';
import {
  ScriptResultServer,
  ScriptResultServerMethods,
} from './core/script.result.server.js';

/**
 * Controller for Note entity scripts.
 * Extends the ScriptClass to provide custom logic for Note operations.
 */
export class TicketController extends ScriptClass {
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
  async afterInsert(items: TicketItem[]): Promise<ScriptResultServer> {
    this.logDebug('afterInsert', 'Starting ticket number generation', {
      itemCount: items.length,
    });
    await this.sleep(0);

    if (items && items.length > 0) {
      for (const ticket of items) {
        this.logTrace('afterInsert', 'Generating ticket number', {
          ticketHandle: ticket.handle,
          createdAt: ticket.createdAt,
        });
        ticket.number =
          `${ticket.createdAt?.getFullYear()}#` +
          (ticket.handle ?? 0).toString().padStart(5, '0');
        this.logInfo('afterInsert', 'Assigned ticket number', {
          ticketHandle: ticket.handle,
          ticketNumber: ticket.number,
        });
      }
    }

    this.logDebug('afterInsert', 'Completed ticket number generation', {
      itemCount: items.length,
    });

    return new ScriptResultServer(items, ScriptResultServerMethods.overwrite);
  }
}
