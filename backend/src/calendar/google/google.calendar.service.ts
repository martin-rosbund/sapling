/**
 * @class GoogleCalendarService
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Service for managing calendar events in Google Calendar via Google Calendar API.
 * Handles creation, update, deletion, and queuing of events for Google calendars.
 * Integrates with EventDeliveryService for event delivery and uses MikroORM for persistence.
 *
 * @property        {EventDeliveryService} eventDeliveryService Service for event delivery and queuing
 * @property        {EntityManager} em                         MikroORM EntityManager for database operations
 *
 * @method          queueEvent           Queues an event for delivery to Google calendar
 * @method          setEvent             Sets (creates, updates, or deletes) an event in Google calendar
 * @method          createEvent          Creates a new event in Google calendar
 * @method          updateEvent          Updates an existing event in Google calendar
 * @method          deleteEvent          Deletes an event from Google calendar and removes reference
 * @method          getGoogleEvent       Maps EventItem to Google Calendar event resource
 */
import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { EventItem } from '../../entity/EventItem';
import { EventDeliveryService } from '../event.delivery.service';
import { PersonSessionItem } from '../../entity/PersonSessionItem';
import { calendar_v3 } from '@googleapis/calendar';
import { EntityManager } from '@mikro-orm/core';
import { EventGoogleItem } from '../../entity/EventGoogleItem';
import { buildGoogleRecurrence } from '../calendar.recurrence';

/**
 * Service for managing calendar events in Google Calendar via Google Calendar API.
 * Handles creation, update, deletion, and queuing of events for Google calendars.
 * Integrates with EventDeliveryService for event delivery and uses MikroORM for persistence.
 */
@Injectable()
export class GoogleCalendarService {
  /**
   * Creates a new GoogleCalendarService.
   * @param {EventDeliveryService} eventDeliveryService Service for event delivery and queuing
   * @param {EntityManager} em MikroORM EntityManager for database operations
   */
  constructor(
    private readonly eventDeliveryService: EventDeliveryService,
    private readonly em: EntityManager,
  ) {}

  /**
   * Queues an event for delivery to Google calendar using the EventDeliveryService.
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
      provider: 'google',
      sessionHandle: session.handle,
    });
  }

  /**
   * Sets (creates, updates, or deletes) an event in the Google calendar based on its status.
   * - If the event is canceled and exists in Google, it will be deleted.
   * - If the event exists, it will be updated.
   * - Otherwise, a new event will be created.
   * @param {EventItem} event The event to set
   * @param {PersonSessionItem} session The user session containing access tokens
   * @returns {Promise<any>} The result of the operation (create, update, or delete)
   */
  async setEvent(eventHandle: number, accessToken: string): Promise<any> {
    const calendar = google.calendar({ version: 'v3' });
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

    const reference = await emFork.findOne(EventGoogleItem, {
      event: event.handle as never,
    });

    switch (event.status.handle) {
      case 'canceled':
      case 'completed':
        if (reference) {
          return await this.deleteEvent(
            calendar,
            reference,
            accessToken,
            emFork,
          );
        }
        break;
      default:
        if (reference) {
          return await this.updateEvent(
            calendar,
            event,
            reference,
            accessToken,
          );
        } else {
          return await this.createEvent(calendar, event, accessToken, emFork);
        }
    }
  }

  /**
   * Creates a new event in the Google calendar using Google Calendar API.
   * @param {calendar_v3.Calendar} calendar Authenticated Google Calendar client
   * @param {EventItem} event The event to create
   * @param {PersonSessionItem} session The user session containing access tokens
   * @param {EntityManager} emFork Forked EntityManager for database operations
   * @returns {Promise<any>} The created event object from Google Calendar API
   */
  private async createEvent(
    calendar: calendar_v3.Calendar,
    event: EventItem,
    accessToken: string,
    emFork: EntityManager,
  ): Promise<any> {
    const eventResource = this.getGoogleEvent(event);

    // Create event in Google Calendar
    const created = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: eventResource,
      auth: accessToken,
    });

    // Create EventGoogleItem with Google event ID and save
    if (created?.data?.id) {
      const reference = new EventGoogleItem();
      reference.event = event;
      reference.referenceHandle = created.data.id;
      await emFork.persist(reference).flush();
    }

    return created;
  }

  /**
   * Updates an existing event in the Google calendar using Google Calendar API.
   * @param {calendar_v3.Calendar} calendar Authenticated Google Calendar client
   * @param {EventItem} event The updated event data
   * @param {EventGoogleItem} reference The EventGoogleItem containing the Google event ID
   * @param {PersonSessionItem} session The user session containing access tokens
   * @returns {Promise<any>} The updated event object from Google Calendar API
   */
  private async updateEvent(
    calendar: calendar_v3.Calendar,
    event: EventItem,
    reference: EventGoogleItem,
    accessToken: string,
  ): Promise<any> {
    const eventResource = this.getGoogleEvent(event);

    // reference.referenceHandle should contain the Google event id
    return await calendar.events.patch({
      calendarId: 'primary',
      eventId: reference.referenceHandle,
      requestBody: eventResource,
      auth: accessToken,
    });
  }

  /**
   * Deletes an event from the Google calendar and removes its reference from the database.
   * @param {calendar_v3.Calendar} calendar Authenticated Google Calendar client
   * @param {EventGoogleItem} reference The EventGoogleItem containing the Google event ID
   * @param {PersonSessionItem} session The user session containing access tokens
   * @param {EntityManager} emFork Forked EntityManager for database operations
   * @returns {Promise<any>} An object indicating success
   */
  private async deleteEvent(
    calendar: calendar_v3.Calendar,
    reference: EventGoogleItem,
    accessToken: string,
    emFork: EntityManager,
  ): Promise<any> {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: reference.referenceHandle,
      auth: accessToken,
    });
    // Remove the EventGoogleItem from the database
    await emFork.remove(reference).flush();
    return { success: true };
  }

  /**
   * Maps EventItem to Google Calendar event resource.
   * @param {EventItem} event The event to map
   * @returns {object} Google Calendar event resource
   */
  private getGoogleEvent(event: EventItem) {
    const eventResource = {
      summary: event.title,
      description: event.description,
      start: { dateTime: event.startDate.toISOString() },
      end: { dateTime: event.endDate.toISOString() },
      recurrence: buildGoogleRecurrence(event.recurrenceRule),
      attendees: event.participants?.map((x) => ({
        email: x.email,
        displayName: `${x.firstName} ${x.lastName}`,
      })),
    };

    return eventResource;
  }
}
