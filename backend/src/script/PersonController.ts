import { EntityItem } from '../entity/EntityItem.js';
import { PersonItem } from '../entity/PersonItem.js';
import { ScriptClass } from './core/script.class.js';
import { ScriptResultServer } from './core/script.result.server.js';

/**
 * Controller for Note entity scripts.
 * Extends the ScriptClass to provide custom logic for Person operations.
 */
export class PersonController extends ScriptClass {
  /**
   * Creates a new instance of PersonController.
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
   * @param {NoteItem[]} items - The new Note records to be inserted.
   * @returns {Promise<ScriptResultServer>} The result of the after read event.
   */
  async afterRead(items: PersonItem[]): Promise<ScriptResultServer> {
    await this.sleep(0);

    items.forEach((item) => {
      item.loginPassword = '*****';
    });

    global.log.trace(
      `scriptClass - afterRead - ${this.entity.handle} - count items ${items.length}`,
    );
    return new ScriptResultServer(items);
  }
}
