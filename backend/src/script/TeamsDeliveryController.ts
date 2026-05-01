import type { EntityManager } from '@mikro-orm/core';
import type { AzureCalendarService } from '../calendar/azure/azure.calendar.service';
import type { GoogleCalendarService } from '../calendar/google/google.calendar.service';
import type { MailService } from '../api/mail/mail.service';
import type { WebhookService } from '../api/webhook/webhook.service';
import type { EventDeliveryService } from '../calendar/event.delivery.service';
import type { TeamsService } from '../api/teams/teams.service';
import { EntityItem } from '../entity/EntityItem.js';
import { PersonItem } from '../entity/PersonItem.js';
import { TeamsDeliveryItem } from '../entity/TeamsDeliveryItem.js';
import { ScriptClass } from './core/script.class.js';
import { ScriptResultClient } from './core/script.result.client.js';

export class TeamsDeliveryController extends ScriptClass {
  constructor(
    entity: EntityItem,
    user: PersonItem,
    em?: EntityManager,
    azureCalendarService?: AzureCalendarService,
    googleCalendarService?: GoogleCalendarService,
    mailService?: MailService,
    webhookService?: WebhookService,
    eventDeliveryService?: EventDeliveryService,
    teamsService?: TeamsService,
  ) {
    super(
      entity,
      user,
      em,
      azureCalendarService,
      googleCalendarService,
      mailService,
      webhookService,
      eventDeliveryService,
      teamsService,
    );
  }

  async execute(items: object[], name: string): Promise<ScriptResultClient> {
    if (name !== 'retryDelivery') {
      return super.execute(items, name);
    }

    if (!this.teamsService) {
      return new ScriptResultClient();
    }

    for (const item of items as TeamsDeliveryItem[]) {
      if (item.handle != null) {
        await this.teamsService.retryDelivery(item.handle);
      }
    }

    return new ScriptResultClient();
  }
}
