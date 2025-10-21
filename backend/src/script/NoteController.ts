import { NoteItem } from 'src/entity/NoteItem.js';
import { EntityItem } from '../entity/EntityItem.js';
import { PersonItem } from '../entity/PersonItem.js';
import { ScriptClass } from './core/script.class.js';
import { ScriptResultServer } from './core/script.result.server.js';

export class NoteController extends ScriptClass {
  constructor(entity: EntityItem, user: PersonItem) {
    super(entity, user);
  }

  async beforeInsert(items: NoteItem[]): Promise<ScriptResultServer> {
    await this.sleep(0);

    items.forEach((item) => {
      item.person = this.user.handle;
    });

    global.log.trace(
      `scriptClass - beforeInsert - ${this.entity.handle} - count items ${items.length}`,
    );
    return new ScriptResultServer(items);
  }
}
