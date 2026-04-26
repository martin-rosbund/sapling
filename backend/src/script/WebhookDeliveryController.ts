import type { EntityManager } from '@mikro-orm/core';
import { EntityItem } from '../entity/EntityItem.js';
import { PersonItem } from '../entity/PersonItem.js';
import { WebhookDeliveryItem } from '../entity/WebhookDeliveryItem.js';
import { ScriptClass } from './core/script.class.js';
import { ScriptResultClient } from './core/script.result.client.js';

export class WebhookDeliveryController extends ScriptClass {
  constructor(entity: EntityItem, user: PersonItem, em?: EntityManager) {
    super(entity, user, em);
  }

  async execute(items: object[], name: string): Promise<ScriptResultClient> {
    if (name !== 'retryDelivery') {
      return super.execute(items, name);
    }

    if (!this.webhookService) {
      return new ScriptResultClient();
    }

    for (const item of items as WebhookDeliveryItem[]) {
      if (item.handle != null) {
        await this.webhookService.retryDelivery(item.handle);
      }
    }

    global.log.trace(
      `scriptClass - execute - ${this.entity.handle} - action retryDelivery - count items ${items.length}`,
    );

    return new ScriptResultClient();
  }
}
