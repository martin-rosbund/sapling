import type { EntityManager } from '@mikro-orm/core';
import { EmailDeliveryItem } from '../entity/EmailDeliveryItem.js';
import { EntityItem } from '../entity/EntityItem.js';
import { PersonItem } from '../entity/PersonItem.js';
import { ScriptClass } from './core/script.class.js';
import { ScriptResultClient } from './core/script.result.client.js';

export class EmailDeliveryController extends ScriptClass {
  constructor(entity: EntityItem, user: PersonItem, em?: EntityManager) {
    super(entity, user, em);
  }

  async execute(items: object[], name: string): Promise<ScriptResultClient> {
    if (name !== 'retryDelivery') {
      return super.execute(items, name);
    }

    if (!this.mailService) {
      return new ScriptResultClient();
    }

    for (const item of items as EmailDeliveryItem[]) {
      if (item.handle != null) {
        await this.mailService.retryDelivery(item.handle);
      }
    }

    global.log.trace(
      `scriptClass - execute - ${this.entity.handle} - action retryDelivery - count items ${items.length}`,
    );

    return new ScriptResultClient();
  }
}
