import { EntityItem } from '../entity/EntityItem.js';
import { PersonItem } from '../entity/PersonItem.js';
import { ScriptClass } from './core/script.class.js';
import {
  ScriptResultServer,
  ScriptResultServerMethods,
} from './core/script.result.server.js';

/**
 * Controller for Note entity scripts.
 * Extends the ScriptClass to provide custom logic for Note operations.
 */
export class PersonController extends ScriptClass {
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
  async beforeUpdate(items: PersonItem[]): Promise<ScriptResultServer> {
    await this.sleep(0);

    if (items && items.length > 0) {
      for (const person of items) {
        if (person.loginPassword == '') {
          delete person.loginPassword;
        }
      }
    }

    global.log.trace(
      `scriptClass - beforeUpdate - ${this.entity.handle} - count items ${items.length}`,
    );

    return new ScriptResultServer(items, ScriptResultServerMethods.overwrite);
  }
}
