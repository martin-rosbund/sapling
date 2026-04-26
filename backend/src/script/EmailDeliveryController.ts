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
    this.logDebug('execute', 'Received client script request', {
      action: name,
      itemCount: items.length,
    });

    if (name !== 'retryDelivery') {
      this.logTrace('execute', 'Delegating unsupported action to base class', {
        action: name,
      });
      return super.execute(items, name);
    }

    if (!this.mailService) {
      this.logWarn('execute', 'Mail service unavailable, skipping retry', {
        action: name,
      });
      return new ScriptResultClient();
    }

    for (const item of items as EmailDeliveryItem[]) {
      this.logTrace('execute', 'Evaluating email delivery retry item', {
        deliveryHandle: item.handle,
      });

      if (item.handle != null) {
        this.logInfo('execute', 'Retrying email delivery', {
          deliveryHandle: item.handle,
        });
        await this.mailService.retryDelivery(item.handle);
        this.logDebug('execute', 'Email delivery retry queued', {
          deliveryHandle: item.handle,
        });
        continue;
      }

      this.logWarn('execute', 'Skipping email delivery without handle', {
        deliveryHandle: item.handle,
      });
    }

    this.logDebug('execute', 'Completed email delivery retry action', {
      action: name,
      itemCount: items.length,
    });

    return new ScriptResultClient();
  }
}
