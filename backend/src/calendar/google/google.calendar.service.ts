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
import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { google } from 'googleapis';
import { EventItem } from '../../entity/EventItem';
import { EventDeliveryService } from '../event.delivery.service';
import { PersonSessionItem } from '../../entity/PersonSessionItem';
import { calendar_v3 } from '@googleapis/calendar';
import { EntityManager } from '@mikro-orm/core';
import { EventGoogleItem } from '../../entity/EventGoogleItem';
import { buildGoogleRecurrence } from '../calendar.recurrence';
import { PersonItem } from '../../entity/PersonItem';
import { EventTypeItem } from '../../entity/EventTypeItem';
import { EventStatusItem } from '../../entity/EventStatusItem';
import {
  GOOGLE_CALLBACK_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
} from '../../constants/project.constants';
import { ImportGoogleCalendarEventsResponseDto } from './dto/import-google-calendar-events.dto';

type ImportGoogleCalendarEventsRange = {
  startDateTime: Date;
  endDateTime: Date;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAuthenticationProviderError(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }

  const status =
    typeof error.status === 'number'
      ? error.status
      : typeof error.code === 'number'
        ? error.code
        : isRecord(error.response) && typeof error.response.status === 'number'
          ? error.response.status
          : undefined;

  if (status === 401 || status === 403) {
    return true;
  }

  const message =
    typeof error.message === 'string' ? error.message.toLowerCase() : '';
  return (
    message.includes('token') ||
    message.includes('auth') ||
    message.includes('unauthorized') ||
    message.includes('forbidden')
  );
}

function normalizeGoogleDateTime(
  value?: calendar_v3.Schema$EventDateTime | null,
): Date | null {
  const rawDateTime = value?.dateTime?.trim();
  if (rawDateTime) {
    const date = new Date(rawDateTime);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const rawDate = value?.date?.trim();
  if (!rawDate) {
    return null;
  }

  const date = new Date(`${rawDate}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength
    ? value
    : value.slice(0, maxLength - 3) + '...';
}

function normalizeEmail(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized && /^[^@\s<>]+@[^@\s<>]+$/.test(normalized)
    ? normalized
    : null;
}

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
    @Inject(forwardRef(() => EventDeliveryService))
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
   * @param {number} eventHandle Handle of the EventItem to synchronize
   * @param {string} accessToken OAuth access token of the calling user
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

  async importEvents(
    currentUser: PersonItem,
    range: ImportGoogleCalendarEventsRange,
  ): Promise<ImportGoogleCalendarEventsResponseDto> {
    if (
      Number.isNaN(range.startDateTime.getTime()) ||
      Number.isNaN(range.endDateTime.getTime()) ||
      range.startDateTime > range.endDateTime
    ) {
      throw new BadRequestException('calendar.invalidImportRange');
    }

    if (this.getPersonTypeHandle(currentUser) !== 'google') {
      throw new ForbiddenException('calendar.googleUserRequired');
    }

    const emFork = this.em.fork();
    const session = await emFork.findOne(PersonSessionItem, {
      person: { handle: currentUser.handle },
    });

    if (!session) {
      throw new UnauthorizedException('calendar.googleSessionNotFound');
    }

    const accessToken = await this.resolveGoogleAccessToken(session);
    if (!accessToken) {
      throw new UnauthorizedException('calendar.googleTokenNotAvailable');
    }

    const graphEvents = await this.fetchCalendarEventsWithRetry(
      session,
      accessToken,
      range,
    );

    const user = await emFork.findOne(
      PersonItem,
      { handle: currentUser.handle },
      { populate: ['company', 'type'] },
    );
    const type = await emFork.findOne(EventTypeItem, { handle: 'internal' });
    const scheduledStatus = await emFork.findOne(EventStatusItem, {
      handle: 'scheduled',
    });
    const canceledStatus = await emFork.findOne(EventStatusItem, {
      handle: 'canceled',
    });

    if (!user || this.getPersonTypeHandle(user) !== 'google') {
      throw new ForbiddenException('calendar.googleUserRequired');
    }

    if (!user.company || !type || !scheduledStatus || !canceledStatus) {
      throw new BadRequestException('calendar.importDefaultsMissing');
    }

    const result: ImportGoogleCalendarEventsResponseDto = {
      imported: 0,
      created: 0,
      updated: 0,
      skipped: 0,
    };

    for (const graphEvent of graphEvents) {
      const saved = await this.upsertImportedEvent(emFork, graphEvent, {
        user,
        type,
        scheduledStatus,
        canceledStatus,
      });

      if (saved === 'created') {
        result.created += 1;
        result.imported += 1;
      } else if (saved === 'updated') {
        result.updated += 1;
        result.imported += 1;
      } else {
        result.skipped += 1;
      }
    }

    await emFork.flush();
    return result;
  }

  private async fetchCalendarEventsWithRetry(
    session: PersonSessionItem,
    accessToken: string,
    range: ImportGoogleCalendarEventsRange,
  ): Promise<calendar_v3.Schema$Event[]> {
    try {
      return await this.fetchCalendarEvents(accessToken, range);
    } catch (error) {
      if (!isAuthenticationProviderError(error)) {
        throw error;
      }

      const refreshedToken = await this.refreshGoogleAccessToken(session);
      if (!refreshedToken) {
        throw error;
      }

      return this.fetchCalendarEvents(refreshedToken, range);
    }
  }

  private async fetchCalendarEvents(
    accessToken: string,
    range: ImportGoogleCalendarEventsRange,
  ): Promise<calendar_v3.Schema$Event[]> {
    const calendar = google.calendar({ version: 'v3' });
    const events: calendar_v3.Schema$Event[] = [];
    let pageToken: string | undefined;

    do {
      const response = await calendar.events.list({
        calendarId: 'primary',
        auth: accessToken,
        timeMin: range.startDateTime.toISOString(),
        timeMax: range.endDateTime.toISOString(),
        singleEvents: true,
        showDeleted: true,
        orderBy: 'startTime',
        maxResults: 2500,
        pageToken,
      });

      events.push(...(response.data.items ?? []));
      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);

    return events;
  }

  private async refreshGoogleAccessToken(
    session: PersonSessionItem,
  ): Promise<string | null> {
    const refreshToken = session.refreshToken?.trim();
    if (!refreshToken) {
      return null;
    }

    const auth = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID || undefined,
      GOOGLE_CLIENT_SECRET || undefined,
      GOOGLE_CALLBACK_URL || undefined,
    );

    auth.setCredentials({ refresh_token: refreshToken });
    const refreshed = await auth.refreshAccessToken();
    const accessToken = refreshed.credentials.access_token?.trim() ?? null;

    if (accessToken) {
      session.accessToken = accessToken;
    }

    return accessToken;
  }

  private async resolveGoogleAccessToken(
    session: PersonSessionItem,
  ): Promise<string | null> {
    const directToken = session.accessToken?.trim();
    if (directToken) {
      return directToken;
    }

    return this.refreshGoogleAccessToken(session);
  }

  private getPersonTypeHandle(person: PersonItem): string | undefined {
    return person.type?.handle;
  }

  private async upsertImportedEvent(
    emFork: EntityManager,
    graphEvent: calendar_v3.Schema$Event,
    defaults: {
      user: PersonItem;
      type: EventTypeItem;
      scheduledStatus: EventStatusItem;
      canceledStatus: EventStatusItem;
    },
  ): Promise<'created' | 'updated' | 'skipped'> {
    const referenceHandle = graphEvent.id?.trim();
    const startDate = normalizeGoogleDateTime(graphEvent.start);
    const endDate = normalizeGoogleDateTime(graphEvent.end);

    if (!referenceHandle || !startDate || !endDate) {
      return 'skipped';
    }

    const reference = await emFork.findOne(
      EventGoogleItem,
      { referenceHandle },
      { populate: ['event', 'event.participants'] },
    );

    if (graphEvent.status === 'cancelled' && !reference) {
      return 'skipped';
    }

    const status =
      graphEvent.status === 'cancelled'
        ? defaults.canceledStatus
        : defaults.scheduledStatus;
    const participantPeople = await this.resolveImportedParticipants(
      emFork,
      graphEvent,
      defaults.user,
    );

    if (reference?.event && typeof reference.event === 'object') {
      this.assignImportedEvent(reference.event, graphEvent, {
        startDate,
        endDate,
        status,
        participants: participantPeople,
      });
      return 'updated';
    }

    const event = new EventItem();
    event.type = defaults.type;
    event.creatorCompany = defaults.user.company;
    event.creatorPerson = defaults.user;
    event.assigneeCompany = defaults.user.company;
    event.assigneePerson = defaults.user;
    this.assignImportedEvent(event, graphEvent, {
      startDate,
      endDate,
      status,
      participants: participantPeople,
    });

    const newReference = new EventGoogleItem();
    newReference.event = event;
    newReference.referenceHandle = referenceHandle;

    emFork.persist(event);
    emFork.persist(newReference);
    return 'created';
  }

  private assignImportedEvent(
    event: EventItem,
    graphEvent: calendar_v3.Schema$Event,
    values: {
      startDate: Date;
      endDate: Date;
      status: EventStatusItem;
      participants: PersonItem[];
    },
  ): void {
    event.title = truncate(graphEvent.summary?.trim() || 'Google event', 128);
    event.description = graphEvent.description?.trim() || undefined;
    event.startDate = values.startDate;
    event.endDate = values.endDate;
    event.isAllDay = Boolean(
      graphEvent.start?.date && !graphEvent.start?.dateTime,
    );
    event.onlineMeetingURL =
      graphEvent.hangoutLink ??
      graphEvent.conferenceData?.entryPoints?.find(
        (entryPoint) => entryPoint.entryPointType === 'video',
      )?.uri ??
      event.onlineMeetingURL;
    event.status = values.status;
    event.participants.removeAll();
    event.participants.add(values.participants);
  }

  private async resolveImportedParticipants(
    emFork: EntityManager,
    graphEvent: calendar_v3.Schema$Event,
    user: PersonItem,
  ): Promise<PersonItem[]> {
    const attendeeEmails = Array.from(
      new Set(
        (graphEvent.attendees ?? [])
          .map((attendee) => normalizeEmail(attendee.email))
          .filter((email): email is string => Boolean(email)),
      ),
    );

    const knownAttendees =
      attendeeEmails.length > 0
        ? await emFork.find(PersonItem, { email: { $in: attendeeEmails } })
        : [];
    const participantsByHandle = new Map<number, PersonItem>();

    if (typeof user.handle === 'number') {
      participantsByHandle.set(user.handle, user);
    }

    for (const attendee of knownAttendees) {
      if (typeof attendee.handle === 'number') {
        participantsByHandle.set(attendee.handle, attendee);
      }
    }

    return Array.from(participantsByHandle.values());
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
