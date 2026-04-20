/**
 * @class AzureCalendarService
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Service for managing calendar events in Microsoft Azure (Outlook) via Microsoft Graph API.
 * Handles creation, update, deletion, and queuing of events for Azure calendars.
 * Integrates with EventDeliveryService for event delivery and uses MikroORM for persistence.
 *
 * @property        {EventDeliveryService} eventDeliveryService Service for event delivery and queuing
 * @property        {EntityManager} em                         MikroORM EntityManager for database operations
 *
 * @method          queueEvent           Queues an event for delivery to Azure calendar
 * @method          setEvent             Sets (creates, updates, or deletes) an event in Azure calendar
 * @method          createClient         Creates a Microsoft Graph API client for the given access token
 * @method          createEvent          Creates a new event in Azure calendar
 * @method          updateEvent          Updates an existing event in Azure calendar
 * @method          deleteEvent          Deletes an event from Azure calendar and removes reference
 * @method          getAzureEvent        Maps EventItem to Azure Calendar event resource
 */
import { Injectable } from '@nestjs/common';
import { Client } from '@microsoft/microsoft-graph-client';
import { EventItem } from '../../entity/EventItem';
import { EventDeliveryService } from '../event.delivery.service';
import { PersonSessionItem } from '../../entity/PersonSessionItem';
import { EntityManager } from '@mikro-orm/core';
import { EventAzureItem } from '../../entity/EventAzureItem';

/**
 * Service for managing calendar events in Microsoft Azure (Outlook) via Microsoft Graph API.
 * Handles creation, update, deletion, and queuing of events for Azure calendars.
 * Integrates with EventDeliveryService for event delivery and uses MikroORM for persistence.
 */
@Injectable()
export class AzureCalendarService {
  /**
   * Creates a new AzureCalendarService.
   * @param {EventDeliveryService} eventDeliveryService Service for event delivery and queuing
   * @param {EntityManager} em MikroORM EntityManager for database operations
   */
  constructor(
    private readonly eventDeliveryService: EventDeliveryService,
    private readonly em: EntityManager,
  ) {}

  /**
   * Queues an event for delivery to Azure calendar using the EventDeliveryService.
   * If Redis is disabled, logs a warning and does not queue the event.
   * @param {EventItem} event The event to queue
   * @param {PersonSessionItem} session The user session containing access tokens
   * @returns {Promise<any>} The result of the queue operation or null if Redis is disabled
   */
  async queueEvent(event: EventItem, session: PersonSessionItem) {
    if (typeof session.handle !== 'number') {
      throw new Error('calendar.sessionHandleRequired');
    }

    // Use EventDeliveryService to create delivery and queue
    return await this.eventDeliveryService.queueEventDelivery(event, {
      provider: 'azure',
      sessionHandle: session.handle,
    });
  }

  /**
   * Sets (creates, updates, or deletes) an event in the Azure calendar based on its status.
   * - If the event is canceled and exists in Azure, it will be deleted.
   * - If the event exists, it will be updated.
   * - Otherwise, a new event will be created.
   * @param {EventItem} event The event to set
   * @param {PersonSessionItem} session The user session containing access tokens
   * @returns {Promise<any>} The result of the operation (create, update, or delete)
   */
  async setEvent(eventHandle: number, accessToken: string): Promise<any> {
    const client = this.createClient(accessToken);
    // Fork EntityManager for context-specific actions
    const emFork = this.em.fork();
    const event = await emFork.findOne(
      EventItem,
      { handle: eventHandle },
      { populate: ['participants', 'status', 'type'] },
    );

    if (!event) {
      throw new Error('calendar.eventNotFound');
    }

    const reference = await emFork.findOne(EventAzureItem, {
      event: event.handle as never,
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
   * @param {string} accessToken The OAuth access token for the user
   * @returns {Client} An authenticated Microsoft Graph Client instance
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
   * @param {Client} client Authenticated Microsoft Graph Client
   * @param {EventItem} event The event to create
   * @param {EntityManager} emFork Forked EntityManager for database operations
   * @returns {Promise<any>} The created event object from Microsoft Graph API
   */
  private async createEvent(
    client: Client,
    event: EventItem,
    emFork: EntityManager,
  ): Promise<any> {
    const eventResource = this.getAzureEvent(event);

    // Create event in Azure
    const created = (await client.api('/me/events').post(eventResource)) as {
      id: string;
      onlineMeeting: { joinUrl: string };
    };

    // Create EventAzureItem with Azure event ID and save
    const reference = new EventAzureItem();
    reference.event = event;
    reference.referenceHandle = created.id;
    await emFork.persist(reference).flush();

    if (event.type?.handle === 'online' && created.onlineMeeting?.joinUrl) {
      event.onlineMeetingURL = created.onlineMeeting.joinUrl;
      await emFork.persist(event).flush();
    }
    return created;
  }

  /**
   * Updates an existing event in the Azure calendar using Microsoft Graph API.
   * @param {Client} client Authenticated Microsoft Graph Client
   * @param {EventItem} event The updated event data
   * @param {EventAzureItem} reference The EventAzureItem containing the Azure event ID
   * @param {EntityManager} emFork Forked EntityManager for database operations
   * @returns {Promise<any>} The updated event object from Microsoft Graph API
   */
  private async updateEvent(
    client: Client,
    event: EventItem,
    reference: EventAzureItem,
    emFork: EntityManager,
  ): Promise<any> {
    const eventResource = this.getAzureEvent(event);

    // PATCH Event (without online meeting fields)
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
   * @param {Client} client Authenticated Microsoft Graph Client
   * @param {EventItem} event The event to delete
   * @param {EventAzureItem} reference The EventAzureItem containing the Azure event ID
   * @param {EntityManager} emFork Forked EntityManager for database operations
   * @returns {Promise<any>} An object indicating success
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

  /**
   * Maps EventItem to Azure Calendar event resource.
   * @param {EventItem} event The event to map
   * @returns {object} Azure Calendar event resource
   */
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
