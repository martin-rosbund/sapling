import { GoogleCalendarService } from '../auth/google/google.calendar.service';
import { AzureCalendarService } from '../auth/azure/azure.calendar.service';
import { EntityItem } from '../entity/EntityItem.js';
import { PersonItem } from '../entity/PersonItem.js';
import { ScriptClass } from './core/script.class.js';
import { ScriptResultServer } from './core/script.result.server.js';
import { EventItem } from 'src/entity/EventItem.js';

/**
 * Controller for Note entity scripts.
 * Extends the ScriptClass to provide custom logic for Note operations.
 */
export class EventController extends ScriptClass {
  /**
   * Creates a new instance of NoteController.
   *
   * @param {EntityItem} entity - The entity associated with the script.
   * @param {PersonItem} user - The user executing the script.
   */
  constructor(entity: EntityItem, user: PersonItem) {
    super(entity, user);
  }

  /**
   * Event triggered before new Note records are inserted.
   * Sets the person property of each note to the current user's handle.
   *
   * @param {EventItem[]} items - The new Event records to be inserted.
   * @returns {Promise<ScriptResultServer>} The result of the before insert event.
   */
  async afterInsert(items: EventItem[]): Promise<ScriptResultServer> {
    await this.sleep(0);

    // Kalenderintegration
    if (items && items.length > 0) {
      const accessToken: string = '';
      switch (this.user.type?.handle) {
        case 'azure': {
          //const azureService = new AzureCalendarService();
          for (const event of items) {
            //await azureService.createEvent(event, accessToken);
          }
          break;
        }
        case 'google': {
          //const googleService = new GoogleCalendarService();
          for (const event of items) {
            //await googleService.createEvent(event, accessToken);
          }
          break;
        }
      }
    }

    global.log.trace(
      `scriptClass - afterInsert - ${this.entity.handle} - count items ${items.length}`,
    );
    return new ScriptResultServer(items);
  }
}
