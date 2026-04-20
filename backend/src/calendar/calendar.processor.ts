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
import { EventDeliveryItem } from '../entity/EventDeliveryItem';
import { EventDeliveryStatusItem } from '../entity/EventDeliveryStatusItem';
import { GoogleCalendarService } from './google/google.calendar.service';
import { AzureCalendarService } from './azure/azure.calendar.service';
import { PersonSessionItem } from '../entity/PersonSessionItem';

type CalendarProvider = 'google' | 'azure';

type CalendarDeliveryPayload = {
  provider: CalendarProvider;
  sessionHandle?: number;
  session?: {
    accessToken?: string;
  };
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
        typeof payload.session.accessToken === 'string' &&
        payload.session.accessToken.length > 0))
  );
}

async function resolveSessionAccessToken(
  em: EntityManager,
  payload: CalendarDeliveryPayload,
): Promise<string> {
  if (typeof payload.sessionHandle === 'number') {
    const session = await em.findOne(PersonSessionItem, {
      handle: payload.sessionHandle,
    });

    if (!session?.accessToken) {
      throw new Error('calendar.sessionNotFound');
    }

    return session.accessToken;
  }

  if (payload.session?.accessToken) {
    return payload.session.accessToken;
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
      { populate: ['event', 'status', 'event.participants'] },
    );
    if (!delivery) {
      this.logger.error(`Delivery #${deliveryId} not found in DB`);
      return;
    }

    delivery.attemptCount = job.attemptsMade + 1;
    const event = delivery.event;

    if (!isCalendarDeliveryPayload(delivery.payload)) {
      throw new Error('calendar.invalidPayload');
    }

    const { provider } = delivery.payload;
    const accessToken = await resolveSessionAccessToken(em, delivery.payload);
    const eventHandle = delivery.event.handle;

    if (typeof eventHandle !== 'number') {
      throw new Error('calendar.eventNotFound');
    }

    try {
      let providerResponse: unknown;
      if (provider === 'google') {
        providerResponse = await this.googleCalendarService.setEvent(
          eventHandle,
          accessToken,
        );
      } else {
        providerResponse = await this.azureCalendarService.setEvent(
          eventHandle,
          accessToken,
        );
      }

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
            ? (providerResponse as object)
            : { result: providerResponse });
        delivery.responseHeaders = toPersistedObject(response?.headers);
        delivery.completedAt = new Date();
        await em.flush();
        this.logger.log(`Calendar delivery #${deliveryId} sent successfully.`);
      }
    } catch (error: unknown) {
      // Failure
      const failed = await em.findOne(EventDeliveryStatusItem, {
        handle: 'failed',
      });

      if (failed) {
        delivery.status = failed;
        delivery.completedAt = new Date();

        const errorResponse = getErrorResponse(error);
        if (errorResponse) {
          delivery.responseStatusCode = errorResponse.status;
          delivery.responseBody = toPersistedObject(errorResponse.data);
          delivery.responseHeaders = toPersistedObject(errorResponse.headers);
        } else {
          delivery.responseBody = { error: getErrorMessage(error) };
        }
        await em.flush();
        this.logger.error(`Calendar delivery #${deliveryId} failed.`, error);
      }

      throw error;
    }
  }
}
