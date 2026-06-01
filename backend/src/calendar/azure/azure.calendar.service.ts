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
import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Client } from '@microsoft/microsoft-graph-client';
import axios from 'axios';
import { EventItem } from '../../entity/EventItem';
import { EventDeliveryService } from '../event.delivery.service';
import { PersonSessionItem } from '../../entity/PersonSessionItem';
import { EntityManager } from '@mikro-orm/core';
import { EventAzureItem } from '../../entity/EventAzureItem';
import { buildAzureRecurrence } from '../calendar.recurrence';
import { PersonItem } from '../../entity/PersonItem';
import { EventTypeItem } from '../../entity/EventTypeItem';
import { EventStatusItem } from '../../entity/EventStatusItem';
import {
  AZURE_AD_CLIENT_ID,
  AZURE_AD_CLIENT_SECRET,
  AZURE_AD_SCOPE,
  AZURE_AD_TENNANT_ID,
} from '../../constants/project.constants';
import { ImportAzureCalendarEventsResponseDto } from './dto/import-azure-calendar-events.dto';

type ImportAzureCalendarEventsRange = {
  startDateTime: Date;
  endDateTime: Date;
};

type AzureGraphDateTime = {
  dateTime?: string | null;
  timeZone?: string | null;
};

type AzureGraphAttendee = {
  emailAddress?: {
    address?: string | null;
    name?: string | null;
  } | null;
};

type AzureGraphCalendarEvent = {
  id?: string;
  subject?: string | null;
  bodyPreview?: string | null;
  start?: AzureGraphDateTime | null;
  end?: AzureGraphDateTime | null;
  isAllDay?: boolean | null;
  isCancelled?: boolean | null;
  attendees?: AzureGraphAttendee[] | null;
  onlineMeetingUrl?: string | null;
  onlineMeeting?: {
    joinUrl?: string | null;
  } | null;
};

type AzureCalendarViewResponse = {
  value?: AzureGraphCalendarEvent[];
  '@odata.nextLink'?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAuthenticationProviderError(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }

  const status =
    typeof error.statusCode === 'number'
      ? error.statusCode
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

function normalizeGraphDateTime(
  value?: AzureGraphDateTime | null,
): Date | null {
  const rawDateTime = value?.dateTime?.trim();
  if (!rawDateTime) {
    return null;
  }

  const normalizedDateTime = /(?:z|[+-]\d{2}:\d{2})$/i.test(rawDateTime)
    ? rawDateTime
    : `${rawDateTime}Z`;
  const date = new Date(normalizedDateTime);
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
    @Inject(forwardRef(() => EventDeliveryService))
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
   * @param {number} eventHandle Handle of the EventItem to synchronize
   * @param {string} accessToken OAuth access token of the calling user
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
          return await this.deleteEvent(client, reference, emFork);
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

  async importEvents(
    currentUser: PersonItem,
    range: ImportAzureCalendarEventsRange,
  ): Promise<ImportAzureCalendarEventsResponseDto> {
    if (
      Number.isNaN(range.startDateTime.getTime()) ||
      Number.isNaN(range.endDateTime.getTime()) ||
      range.startDateTime > range.endDateTime
    ) {
      throw new BadRequestException('calendar.invalidImportRange');
    }

    if (this.getPersonTypeHandle(currentUser) !== 'azure') {
      throw new ForbiddenException('calendar.azureUserRequired');
    }

    const emFork = this.em.fork();
    const session = await emFork.findOne(PersonSessionItem, {
      person: { handle: currentUser.handle },
    });

    if (!session) {
      throw new UnauthorizedException('calendar.azureSessionNotFound');
    }

    const accessToken = await this.resolveAzureAccessToken(session);
    if (!accessToken) {
      throw new UnauthorizedException('calendar.azureTokenNotAvailable');
    }

    const graphEvents = await this.fetchCalendarViewWithRetry(
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

    if (!user || this.getPersonTypeHandle(user) !== 'azure') {
      throw new ForbiddenException('calendar.azureUserRequired');
    }

    if (!user.company || !type || !scheduledStatus || !canceledStatus) {
      throw new BadRequestException('calendar.importDefaultsMissing');
    }

    const result: ImportAzureCalendarEventsResponseDto = {
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

  private async fetchCalendarViewWithRetry(
    session: PersonSessionItem,
    accessToken: string,
    range: ImportAzureCalendarEventsRange,
  ): Promise<AzureGraphCalendarEvent[]> {
    try {
      return await this.fetchCalendarView(accessToken, range);
    } catch (error) {
      if (!isAuthenticationProviderError(error)) {
        throw error;
      }

      const refreshedToken = await this.refreshAzureAccessToken(session);
      if (!refreshedToken) {
        throw error;
      }

      return this.fetchCalendarView(refreshedToken, range);
    }
  }

  private async fetchCalendarView(
    accessToken: string,
    range: ImportAzureCalendarEventsRange,
  ): Promise<AzureGraphCalendarEvent[]> {
    const client = this.createClient(accessToken);
    const events: AzureGraphCalendarEvent[] = [];
    let response = (await client
      .api('/me/calendarView')
      .query({
        startDateTime: range.startDateTime.toISOString(),
        endDateTime: range.endDateTime.toISOString(),
        $select:
          'id,subject,bodyPreview,start,end,isAllDay,isCancelled,attendees,onlineMeeting,onlineMeetingUrl',
        $top: '100',
      })
      .header('Prefer', 'outlook.timezone="UTC"')
      .get()) as AzureCalendarViewResponse;

    events.push(...(response.value ?? []));

    while (response['@odata.nextLink']) {
      response = (await client
        .api(response['@odata.nextLink'])
        .header('Prefer', 'outlook.timezone="UTC"')
        .get()) as AzureCalendarViewResponse;
      events.push(...(response.value ?? []));
    }

    return events;
  }

  private async refreshAzureAccessToken(
    session: PersonSessionItem,
  ): Promise<string | null> {
    const refreshToken = session.refreshToken?.trim();
    if (!refreshToken) {
      return null;
    }

    const tokenEndpoint = `https://login.microsoftonline.com/${AZURE_AD_TENNANT_ID || 'common'}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
      client_id: AZURE_AD_CLIENT_ID,
      client_secret: AZURE_AD_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    if (AZURE_AD_SCOPE.length > 0) {
      params.set('scope', AZURE_AD_SCOPE.join(' '));
    }

    const response = await axios.post<{ access_token?: string }>(
      tokenEndpoint,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    const accessToken = response.data.access_token?.trim() ?? null;
    if (accessToken) {
      session.accessToken = accessToken;
    }

    return accessToken;
  }

  private async resolveAzureAccessToken(
    session: PersonSessionItem,
  ): Promise<string | null> {
    const directToken = session.accessToken?.trim();
    if (directToken) {
      return directToken;
    }

    return this.refreshAzureAccessToken(session);
  }

  private getPersonTypeHandle(person: PersonItem): string | undefined {
    return person.type?.handle;
  }

  private async upsertImportedEvent(
    emFork: EntityManager,
    graphEvent: AzureGraphCalendarEvent,
    defaults: {
      user: PersonItem;
      type: EventTypeItem;
      scheduledStatus: EventStatusItem;
      canceledStatus: EventStatusItem;
    },
  ): Promise<'created' | 'updated' | 'skipped'> {
    const referenceHandle = graphEvent.id?.trim();
    const startDate = normalizeGraphDateTime(graphEvent.start);
    const endDate = normalizeGraphDateTime(graphEvent.end);

    if (!referenceHandle || !startDate || !endDate) {
      return 'skipped';
    }

    const reference = await emFork.findOne(
      EventAzureItem,
      { referenceHandle },
      { populate: ['event', 'event.participants'] },
    );

    if (graphEvent.isCancelled === true && !reference) {
      return 'skipped';
    }

    const status =
      graphEvent.isCancelled === true
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

    const newReference = new EventAzureItem();
    newReference.event = event;
    newReference.referenceHandle = referenceHandle;

    emFork.persist(event);
    emFork.persist(newReference);
    return 'created';
  }

  private assignImportedEvent(
    event: EventItem,
    graphEvent: AzureGraphCalendarEvent,
    values: {
      startDate: Date;
      endDate: Date;
      status: EventStatusItem;
      participants: PersonItem[];
    },
  ): void {
    event.title = truncate(graphEvent.subject?.trim() || 'Outlook event', 128);
    event.description = graphEvent.bodyPreview?.trim() || undefined;
    event.startDate = values.startDate;
    event.endDate = values.endDate;
    event.isAllDay = graphEvent.isAllDay === true;
    event.onlineMeetingURL =
      graphEvent.onlineMeeting?.joinUrl ??
      graphEvent.onlineMeetingUrl ??
      event.onlineMeetingURL;
    event.status = values.status;
    event.participants.removeAll();
    event.participants.add(values.participants);
  }

  private async resolveImportedParticipants(
    emFork: EntityManager,
    graphEvent: AzureGraphCalendarEvent,
    user: PersonItem,
  ): Promise<PersonItem[]> {
    const attendeeEmails = Array.from(
      new Set(
        (graphEvent.attendees ?? [])
          .map((attendee) => normalizeEmail(attendee.emailAddress?.address))
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
   * @param {EventAzureItem} reference The EventAzureItem containing the Azure event ID
   * @param {EntityManager} emFork Forked EntityManager for database operations
   * @returns {Promise<any>} An object indicating success
   */
  private async deleteEvent(
    client: Client,
    reference: EventAzureItem,
    emFork: EntityManager,
  ): Promise<any> {
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
    const eventResource: Record<string, unknown> = {
      subject: event.title,
      start: { dateTime: event.startDate.toISOString(), timeZone: 'UTC' },
      end: { dateTime: event.endDate.toISOString(), timeZone: 'UTC' },
      recurrence: buildAzureRecurrence(event.startDate, event.recurrenceRule),
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
