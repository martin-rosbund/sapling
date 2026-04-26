import type { EntityManager } from '@mikro-orm/core';
import { EntityItem } from '../entity/EntityItem.js';
import { EventDeliveryItem } from '../entity/EventDeliveryItem.js';
import { PersonItem } from '../entity/PersonItem.js';
import { ScriptClass } from './core/script.class.js';
import { ScriptResultClient } from './core/script.result.client.js';

export class EventDeliveryController extends ScriptClass {
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

    if (!this.eventDeliveryService) {
      this.logWarn(
        'execute',
        'Event delivery service unavailable, skipping retry',
        {
          action: name,
        },
      );
      return new ScriptResultClient();
    }

    for (const item of items as EventDeliveryItem[]) {
      this.logTrace('execute', 'Evaluating event delivery retry item', {
        deliveryHandle: item.handle,
      });

      if (item.handle != null) {
        this.logInfo('execute', 'Retrying event delivery', {
          deliveryHandle: item.handle,
        });
        await this.eventDeliveryService.retryDelivery(item.handle);
        this.logDebug('execute', 'Event delivery retry queued', {
          deliveryHandle: item.handle,
        });
        continue;
      }

      this.logWarn('execute', 'Skipping event delivery without handle', {
        deliveryHandle: item.handle,
      });
    }

    this.logDebug('execute', 'Completed event delivery retry action', {
      action: name,
      itemCount: items.length,
    });

    return new ScriptResultClient();
  }
}
