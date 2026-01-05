import { Injectable } from '@nestjs/common';
import { Client } from '@microsoft/microsoft-graph-client';
import { EventItem } from '../../entity/EventItem';
import { EventDeliveryService } from '../event.delivery.service';
import { PersonSessionItem } from 'src/entity/PersonSessionItem';
import { EntityManager } from '@mikro-orm/mysql';
import { EventAzureItem } from 'src/entity/EventAzureItem';

/**
 * Service for managing calendar events in Microsoft Azure (Outlook) via Microsoft Graph API.
 * Handles creation, update, deletion, and queuing of events for Azure calendars.
 * Integrates with EventDeliveryService for event delivery and uses MikroORM for persistence.
 */
@Injectable()
export class AzureCalendarService {
  /**
   * Constructor for AzureCalendarService.
   * @param eventDeliveryService Service for event delivery and queuing.
   * @param em MikroORM EntityManager for database operations.
   */
  constructor(
    private readonly eventDeliveryService: EventDeliveryService,
    private readonly em: EntityManager,
  ) {}

  /**
   * Queues an event for delivery to Azure calendar using the EventDeliveryService.
   * If Redis is disabled, logs a warning and does not queue the event.
   * @param event The event to queue.
   * @param session The user session containing access tokens.
   * @returns The result of the queue operation or null if Redis is disabled.
   */
  async queueEvent(event: EventItem, session: PersonSessionItem) {
    // Use EventDeliveryService to create delivery and queue
    return await this.eventDeliveryService.queueEventDelivery(event, {
      session,
      provider: 'azure',
    });
  }

  /**
   * Sets (creates, updates, or deletes) an event in the Azure calendar based on its status.
   * - If the event is canceled and exists in Azure, it will be deleted.
   * - If the event exists, it will be updated.
   * - Otherwise, a new event will be created.
   * @param event The event to set.
   * @param session The user session containing access tokens.
   * @returns The result of the operation (create, update, or delete).
   */
  async setEvent(event: EventItem, session: PersonSessionItem): Promise<any> {
    const client = this.createClient(session?.accessToken ?? '');
    // Fork EntityManager for context-specific actions
    const emFork = this.em.fork();
    const reference = await emFork.findOne(EventAzureItem, {
      event,
    });

    switch (event.status.handle) {
      case 'canceled':
      case 'completed':
        if (reference) {
          return await this.deleteEvent(client, event, reference, emFork);
        }
        break;
      default:
        if (reference) {
          return await this.updateEvent(client, event, reference, emFork);
        } else {
          return await this.createEvent(client, event, emFork);
        }
    }
  }

  /**
   * Creates a Microsoft Graph API client for the given access token.
   * @param accessToken The OAuth access token for the user.
   * @returns An authenticated Microsoft Graph Client instance.
   */
  private createClient(accessToken: string): Client {
    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
    return client;
  }

  /**
   * Creates a new event in the Azure calendar using Microsoft Graph API.
   * @param client Authenticated Microsoft Graph Client.
   * @param event The event to create.
   * @returns The created event object from Microsoft Graph API.
   */
  private async createEvent(
    client: Client,
    event: EventItem,
    emFork: EntityManager,
  ): Promise<any> {
    const eventResource = this.getAzureEvent(event);

    // Event in Azure anlegen
    const created = (await client.api('/me/events').post(eventResource)) as {
      id: string;
      onlineMeeting: { joinUrl: string };
    };

    // EventAzureItem mit Azure-Event-ID anlegen und speichern
    const reference = new EventAzureItem();
    reference.event = event;
    reference.referenceHandle = created.id;
    await emFork.persist(reference).flush();

    if (event.type?.handle === 'online') {
      event.onlineMeetingURL = created.onlineMeeting.joinUrl;
      await emFork.persist(event).flush();
    }
    return created;
  }

  /**
   * Updates an existing event in the Azure calendar using Microsoft Graph API.
   * @param client Authenticated Microsoft Graph Client.
   * @param event The updated event data.
   * @param reference The EventAzureItem containing the Azure event ID.
   * @returns The updated event object from Microsoft Graph API.
   */
  private async updateEvent(
    client: Client,
    event: EventItem,
    reference: EventAzureItem,
    emFork: EntityManager,
  ): Promise<any> {
    const eventResource = this.getAzureEvent(event);

    // PATCH Event (ohne Online-Meeting Felder)
    const patchResult = (await client
      .api(`/me/events/${reference.referenceHandle}`)
      .patch(eventResource)) as {
      id: string;
      onlineMeeting: { joinUrl: string };
    };

    if (event.type?.handle === 'online' && patchResult.onlineMeeting?.joinUrl) {
      event.onlineMeetingURL = patchResult.onlineMeeting.joinUrl;
      await emFork.persist(event).flush();
    }

    return patchResult;
  }

  /**
   * Deletes an event from the Azure calendar and removes its reference from the database.
   * @param client Authenticated Microsoft Graph Client.
   * @param reference The EventAzureItem containing the Azure event ID.
   * @returns An object indicating success.
   */
  private async deleteEvent(
    client: Client,
    event: EventItem,
    reference: EventAzureItem,
    emFork: EntityManager,
  ): Promise<any> {
    //if (event.type?.handle === 'online') {
    //  await client.api(`/me/events/${reference.referenceHandle}/decline`).post({
    //    comment: 'Declined via API',
    //    sendResponse: true,
    //  });
    //}
    await client.api(`/me/events/${reference.referenceHandle}`).delete();
    // Remove the EventAzureItem from the database
    await emFork.remove(reference).flush();
    return { success: true };
  }

  private getAzureEvent(event: EventItem) {
    const eventResource = {
      subject: event.title,
      start: { dateTime: event.startDate.toISOString(), timeZone: 'UTC' },
      end: { dateTime: event.endDate.toISOString(), timeZone: 'UTC' },
      attendees: event.participants.map((x) => ({
        emailAddress: {
          address: x.email,
          name: `${x.firstName} ${x.lastName}`,
        },
        type: 'required',
      })),
    };

    if (event.type?.handle === 'online' && !event.onlineMeetingURL) {
      eventResource['isOnlineMeeting'] = true;
      eventResource['onlineMeetingProvider'] = 'teamsForBusiness';
    } else if (event.type?.handle !== 'online') {
      eventResource['body'] = {
        contentType: 'HTML',
        content: event.description,
      };
    }

    return eventResource;
  }
}
