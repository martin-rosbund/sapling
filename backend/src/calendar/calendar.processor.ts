/**
 * @class CalendarProcessor
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Processor for handling calendar event deliveries using BullMQ.
 *
 * @property        {EntityManager}           em                      Entity manager for database operations
 * @property        {GoogleCalendarService}   googleCalendarService   Service for Google Calendar integration
 * @property        {AzureCalendarService}    azureCalendarService    Service for Azure Calendar integration
 * @property        {Logger}                  logger                  Logger instance for logging
 *
 * @method          process                   Processes a calendar delivery job
 */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import axios from 'axios';
import { google } from 'googleapis';
import { EventDeliveryItem } from '../entity/EventDeliveryItem';
import { EventDeliveryStatusItem } from '../entity/EventDeliveryStatusItem';
import { GoogleCalendarService } from './google/google.calendar.service';
import { AzureCalendarService } from './azure/azure.calendar.service';
import { PersonSessionItem } from '../entity/PersonSessionItem';
import {
  AZURE_AD_CLIENT_ID,
  AZURE_AD_CLIENT_SECRET,
  AZURE_AD_SCOPE,
  AZURE_AD_TENNANT_ID,
  GOOGLE_CALLBACK_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
} from '../constants/project.constants';

type CalendarProvider = 'google' | 'azure';

type CalendarDeliveryPayload = {
  provider: CalendarProvider;
  sessionHandle?: number;
  session?: {
    accessToken?: string;
    refreshToken?: string;
  };
};

type ResolvedCalendarSession = {
  accessToken?: string;
  refreshToken?: string;
  session?: PersonSessionItem | null;
};

type HttpResponseLike = {
  status?: number;
  data?: unknown;
  headers?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCalendarDeliveryPayload(
  payload: unknown,
): payload is CalendarDeliveryPayload {
  return (
    isRecord(payload) &&
    (payload.provider === 'google' || payload.provider === 'azure') &&
    ((typeof payload.sessionHandle === 'number' && payload.sessionHandle > 0) ||
      (isRecord(payload.session) &&
        ((typeof payload.session.accessToken === 'string' &&
          payload.session.accessToken.length > 0) ||
          (typeof payload.session.refreshToken === 'string' &&
            payload.session.refreshToken.length > 0))))
  );
}

async function resolveSessionTokens(
  em: EntityManager,
  payload: CalendarDeliveryPayload,
): Promise<ResolvedCalendarSession> {
  if (typeof payload.sessionHandle === 'number') {
    const session = await em.findOne(PersonSessionItem, {
      handle: payload.sessionHandle,
    });

    if (!session) {
      throw new Error('calendar.sessionNotFound');
    }

    return {
      session,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    };
  }

  if (payload.session?.accessToken || payload.session?.refreshToken) {
    return {
      accessToken: payload.session.accessToken,
      refreshToken: payload.session.refreshToken,
    };
  }

  throw new Error('calendar.sessionNotFound');
}

function toHttpResponseLike(value: unknown): HttpResponseLike | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    status: typeof value.status === 'number' ? value.status : undefined,
    data: value.data,
    headers: value.headers,
  };
}

function getErrorResponse(error: unknown): HttpResponseLike | null {
  if (!isRecord(error) || !isRecord(error.response)) {
    return null;
  }

  return toHttpResponseLike(error.response);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function toPersistedObject(value: unknown): object | undefined {
  return isRecord(value) ? value : undefined;
}

function padCalendarValue(value: number): string {
  return String(value).padStart(2, '0');
}

function formatUtcDate(date: Date): string {
  return (
    `${date.getUTCFullYear()}` +
    `${padCalendarValue(date.getUTCMonth() + 1)}` +
    `${padCalendarValue(date.getUTCDate())}` +
    `T${padCalendarValue(date.getUTCHours())}` +
    `${padCalendarValue(date.getUTCMinutes())}` +
    `${padCalendarValue(date.getUTCSeconds())}Z`
  );
}

function escapeICalendarText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function buildCalendarFallback(
  delivery: EventDeliveryItem,
  reason: string,
): object {
  const event = delivery.event;
  const participants = (event.participants ?? [])
    .map((participant) => ({
      email: participant.email?.trim() ?? '',
      name: `${participant.firstName ?? ''} ${participant.lastName ?? ''}`.trim(),
    }))
    .filter((participant) => participant.email.length > 0);
  const recipients = [
    ...new Set(participants.map((participant) => participant.email)),
  ];
  const creatorEmail = event.creatorPerson?.email?.trim() ?? '';
  const organizerName =
    `${event.creatorPerson?.firstName ?? ''} ${event.creatorPerson?.lastName ?? ''}`.trim() ||
    'Sapling';
  const description = event.description?.trim() ?? '';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sapling//Calendar Fallback//EN',
    'BEGIN:VEVENT',
    `UID:sapling-event-${event.handle ?? 'unknown'}-delivery-${delivery.handle ?? 'unknown'}`,
    `DTSTAMP:${formatUtcDate(new Date())}`,
    `DTSTART:${formatUtcDate(event.startDate)}`,
    `DTEND:${formatUtcDate(event.endDate)}`,
    `SUMMARY:${escapeICalendarText(event.title ?? 'Sapling event')}`,
    `DESCRIPTION:${escapeICalendarText(description || reason)}`,
    creatorEmail
      ? `ORGANIZER;CN=${escapeICalendarText(organizerName)}:MAILTO:${creatorEmail}`
      : '',
    ...participants.map(
      (participant) =>
        `ATTENDEE;CN=${escapeICalendarText(participant.name || participant.email)}:MAILTO:${participant.email}`,
    ),
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return {
    fallback: {
      strategy: 'email-draft',
      reason,
      subject: `Kalendereintrag fallback: ${event.title ?? 'Termin'}`,
      to: recipients,
      from: creatorEmail || undefined,
      bodyText: [
        `Der Kalendereintrag "${event.title ?? 'Termin'}" konnte nicht automatisch synchronisiert werden.`,
        reason,
        '',
        `Beginn: ${event.startDate.toISOString()}`,
        `Ende: ${event.endDate.toISOString()}`,
        description ? `Beschreibung: ${description}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      icsFilename: `sapling-event-${event.handle ?? 'unknown'}.ics`,
      icsContent: lines.join('\r\n'),
    },
  };
}

@Processor('calendar')
@Injectable()
export class CalendarProcessor extends WorkerHost {
  /**
   * Logger instance for logging.
   * @type {Logger}
   */
  private readonly logger = new Logger(CalendarProcessor.name);

  /**
   * Creates a new CalendarProcessor.
   * @param {EntityManager} em Entity manager for database operations
   * @param {GoogleCalendarService} googleCalendarService Service for Google Calendar integration
   * @param {AzureCalendarService} azureCalendarService Service for Azure Calendar integration
   */
  constructor(
    private readonly em: EntityManager,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly azureCalendarService: AzureCalendarService,
  ) {
    super();
  }

  private async refreshAccessToken(
    provider: CalendarProvider,
    refreshToken: string | undefined,
  ): Promise<string | null> {
    if (!refreshToken) {
      return null;
    }

    if (provider === 'google') {
      const auth = new google.auth.OAuth2(
        GOOGLE_CLIENT_ID || undefined,
        GOOGLE_CLIENT_SECRET || undefined,
        GOOGLE_CALLBACK_URL || undefined,
      );

      auth.setCredentials({ refresh_token: refreshToken });
      const refreshed = await auth.refreshAccessToken();
      return refreshed.credentials.access_token ?? null;
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

    return response.data.access_token ?? null;
  }

  private async resolveAccessToken(
    provider: CalendarProvider,
    sessionContext: ResolvedCalendarSession,
  ): Promise<string | null> {
    const directToken = sessionContext.accessToken?.trim();
    if (directToken) {
      return directToken;
    }

    const refreshedToken = await this.refreshAccessToken(
      provider,
      sessionContext.refreshToken,
    );
    if (refreshedToken) {
      if (sessionContext.session) {
        sessionContext.session.accessToken = refreshedToken;
      }
      sessionContext.accessToken = refreshedToken;
      return refreshedToken;
    }

    return null;
  }

  private async executeProviderDelivery(
    provider: CalendarProvider,
    eventHandle: number,
    accessToken: string,
  ): Promise<unknown> {
    if (provider === 'google') {
      return this.googleCalendarService.setEvent(eventHandle, accessToken);
    }

    return this.azureCalendarService.setEvent(eventHandle, accessToken);
  }

  private async persistFailureWithFallback(
    em: EntityManager,
    delivery: EventDeliveryItem,
    error: unknown,
    fallbackReason: string,
  ): Promise<void> {
    const failed = await em.findOne(EventDeliveryStatusItem, {
      handle: 'failed',
    });

    if (!failed) {
      return;
    }

    delivery.status = failed;
    delivery.completedAt = new Date();

    const errorResponse = getErrorResponse(error);
    const fallback = buildCalendarFallback(delivery, fallbackReason);

    delivery.responseStatusCode = errorResponse?.status ?? 202;
    delivery.responseBody = {
      ...(errorResponse
        ? {
            providerError: {
              status: errorResponse.status,
              body: toPersistedObject(errorResponse.data),
            },
          }
        : {
            providerError: {
              message: getErrorMessage(error),
            },
          }),
      ...fallback,
    };
    delivery.responseHeaders = toPersistedObject(errorResponse?.headers);

    await em.flush();
  }

  /**
   * Processes a calendar delivery job.
   * @param {Job<{ deliveryId: number }>} job Job containing deliveryId
   * @returns {Promise<any>} Result of processing
   */
  async process(job: Job<{ deliveryId: number }>): Promise<any> {
    // Use a forked EntityManager for isolation
    const em = this.em.fork();
    const deliveryId = job.data.deliveryId;
    this.logger.debug(
      `Processing calendar delivery #${deliveryId} (Attempt ${job.attemptsMade + 1})`,
    );

    const delivery = await em.findOne(
      EventDeliveryItem,
      { handle: deliveryId },
      {
        populate: [
          'event',
          'status',
          'event.participants',
          'event.creatorPerson',
        ],
      },
    );
    if (!delivery) {
      this.logger.error(`Delivery #${deliveryId} not found in DB`);
      return;
    }

    delivery.attemptCount = job.attemptsMade + 1;

    if (!isCalendarDeliveryPayload(delivery.payload)) {
      throw new Error('calendar.invalidPayload');
    }

    const { provider } = delivery.payload;
    const sessionContext = await resolveSessionTokens(em, delivery.payload);
    const eventHandle = delivery.event.handle;

    if (typeof eventHandle !== 'number') {
      throw new Error('calendar.eventNotFound');
    }

    const accessToken = await this.resolveAccessToken(provider, sessionContext);
    if (!accessToken) {
      const reason =
        'Es konnte kein gueltiger Access-Token fuer die Kalendersynchronisation ermittelt werden.';
      this.logger.warn(
        `Calendar delivery #${deliveryId} uses fallback because no access token is available.`,
      );
      await this.persistFailureWithFallback(
        em,
        delivery,
        new Error(reason),
        reason,
      );
      return;
    }

    try {
      const providerResponse = await this.executeProviderDelivery(
        provider,
        eventHandle,
        accessToken,
      );

      const response = toHttpResponseLike(providerResponse);

      // Success
      const success = await em.findOne(EventDeliveryStatusItem, {
        handle: 'success',
      });

      if (success) {
        delivery.status = success;
        delivery.responseStatusCode = response?.status || 200;
        delivery.responseBody =
          toPersistedObject(response?.data) ||
          (isRecord(providerResponse)
            ? providerResponse
            : { result: providerResponse });
        delivery.responseHeaders = toPersistedObject(response?.headers);
        delivery.completedAt = new Date();
        await em.flush();
        this.logger.log(`Calendar delivery #${deliveryId} sent successfully.`);
      }
    } catch (error: unknown) {
      const canRetryWithRefresh = !!sessionContext.refreshToken;

      if (canRetryWithRefresh) {
        try {
          const refreshedToken = await this.refreshAccessToken(
            provider,
            sessionContext.refreshToken,
          );

          if (refreshedToken) {
            if (sessionContext.session) {
              sessionContext.session.accessToken = refreshedToken;
            }

            sessionContext.accessToken = refreshedToken;
            const providerResponse = await this.executeProviderDelivery(
              provider,
              eventHandle,
              refreshedToken,
            );
            const response = toHttpResponseLike(providerResponse);
            const success = await em.findOne(EventDeliveryStatusItem, {
              handle: 'success',
            });

            if (success) {
              delivery.status = success;
              delivery.responseStatusCode = response?.status || 200;
              delivery.responseBody =
                toPersistedObject(response?.data) ||
                (isRecord(providerResponse)
                  ? providerResponse
                  : { result: providerResponse });
              delivery.responseHeaders = toPersistedObject(response?.headers);
              delivery.completedAt = new Date();
              await em.flush();
              this.logger.log(
                `Calendar delivery #${deliveryId} sent successfully after token refresh.`,
              );
              return;
            }
          }
        } catch (refreshError) {
          this.logger.warn(
            `Calendar delivery #${deliveryId} token refresh failed: ${getErrorMessage(refreshError)}`,
          );
        }
      }

      const reason =
        'Der Kalendereintrag konnte nicht direkt synchronisiert werden. Ein E-Mail-Fallback wurde vorbereitet.';
      await this.persistFailureWithFallback(em, delivery, error, reason);
      this.logger.error(`Calendar delivery #${deliveryId} failed.`, error);
    }
  }
}
