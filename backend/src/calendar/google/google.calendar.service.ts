import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { EventItem } from '../../entity/EventItem';
import { EventDeliveryService } from '../event.delivery.service';
import { REDIS_ENABLED } from '../../constants/project.constants';
import { PersonSessionItem } from 'src/entity/PersonSessionItem';
import { calendar_v3 } from '@googleapis/calendar';
import { EntityManager } from '@mikro-orm/core';
import { EventGoogleItem } from 'src/entity/EventGoogleItem';

/**
 * Service for managing calendar events in Google Calendar via Google Calendar API.
 * Handles creation, update, deletion, and queuing of events for Google calendars.
 * Integrates with EventDeliveryService for event delivery and uses MikroORM for persistence.
 */
@Injectable()
export class GoogleCalendarService {
  /**
   * Constructor for GoogleCalendarService.
   * @param eventDeliveryService Service for event delivery and queuing.
   * @param em MikroORM EntityManager for database operations.
   */
  constructor(
    private readonly eventDeliveryService: EventDeliveryService,
    private readonly em: EntityManager,
  ) {}

  /**
   * Queues an event for delivery to Google calendar using the EventDeliveryService.
   * If Redis is disabled, logs a warning and does not queue the event.
   * @param event The event to queue.
   * @param session The user session containing access tokens.
   * @returns The result of the queue operation or null if Redis is disabled.
   */
  async queueEvent(event: EventItem, session: PersonSessionItem) {
    // Use EventDeliveryService to create delivery and queue
    return await this.eventDeliveryService.queueEventDelivery(event, {
      session,
      provider: 'google',
    });
  }

  /**
   * Sets (creates, updates, or deletes) an event in the Google calendar based on its status.
   * - If the event is canceled and exists in Google, it will be deleted.
   * - If the event exists, it will be updated.
   * - Otherwise, a new event will be created.
   * @param event The event to set.
   * @param session The user session containing access tokens.
   * @returns The result of the operation (create, update, or delete).
   */
  async setEvent(event: EventItem, session: PersonSessionItem): Promise<any> {
    const calendar = google.calendar({ version: 'v3' });
    // Fork EntityManager for context-specific actions
    const emFork = this.em.fork();
    const reference = await emFork.findOne(EventGoogleItem, { event });

    switch (event.status.handle) {
      case 'canceled':
      case 'completed':
        if (reference) {
          return await this.deleteEvent(calendar, reference, session, emFork);
        }
        break;
      default:
        if (reference) {
          return await this.updateEvent(calendar, event, reference, session);
        } else {
          return await this.createEvent(calendar, event, session, emFork);
        }
    }
  }

  /**
   * Creates a new event in the Google calendar using Google Calendar API.
   * @param calendar Authenticated Google Calendar client.
   * @param event The event to create.
   * @param session The user session containing access tokens.
   * @returns The created event object from Google Calendar API.
   */
  private async createEvent(
    calendar: calendar_v3.Calendar,
    event: EventItem,
    session: PersonSessionItem,
    emFork: EntityManager,
  ): Promise<any> {
    const eventResource = {
      summary: event.title,
      description: event.description,
      start: { dateTime: event.startDate.toISOString() },
      end: { dateTime: event.endDate.toISOString() },
      attendees: event.participants?.map((x) => ({
        email: x.email,
        displayName: `${x.firstName} ${x.lastName}`,
      })),
      // Optionally add more fields as needed
    };
    // Event in Google Calendar anlegen
    const created = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: eventResource,
      auth: session?.accessToken ?? '',
    });

    // EventGoogleItem mit Google-Event-ID anlegen und speichern
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
   * @param calendar Authenticated Google Calendar client.
   * @param event The updated event data.
   * @param reference The EventGoogleItem containing the Google event ID.
   * @param session The user session containing access tokens.
   * @returns The updated event object from Google Calendar API.
   */
  private async updateEvent(
    calendar: calendar_v3.Calendar,
    event: EventItem,
    reference: EventGoogleItem,
    session: PersonSessionItem,
    // emFork: EntityManager, // Not used, so removed
  ): Promise<any> {
    const eventResource = {
      summary: event.title,
      description: event.description,
      start: { dateTime: event.startDate.toISOString() },
      end: { dateTime: event.endDate.toISOString() },
      attendees: event.participants?.map((x) => ({
        email: x.email,
        displayName: `${x.firstName} ${x.lastName}`,
      })),
      // Optionally add more fields as needed
    };
    // reference.referenceHandle should contain the Google event id
    return await calendar.events.patch({
      calendarId: 'primary',
      eventId: reference.referenceHandle,
      requestBody: eventResource,
      auth: session?.accessToken ?? '',
    });
  }

  /**
   * Deletes an event from the Google calendar and removes its reference from the database.
   * @param calendar Authenticated Google Calendar client.
   * @param reference The EventGoogleItem containing the Google event ID.
   * @param session The user session containing access tokens.
   * @returns An object indicating success.
   */
  private async deleteEvent(
    calendar: calendar_v3.Calendar,
    reference: EventGoogleItem,
    session: PersonSessionItem,
    emFork: EntityManager,
  ): Promise<any> {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: reference.referenceHandle,
      auth: session?.accessToken ?? '',
    });
    // Remove the EventGoogleItem from the database
    await emFork.remove(reference).flush();
    return { success: true };
  }
}
