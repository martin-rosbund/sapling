import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/mysql';
import { EventDeliveryItem } from '../entity/EventDeliveryItem';
import { EventDeliveryStatusItem } from '../entity/EventDeliveryStatusItem';
import { GoogleCalendarService } from './google/google.calendar.service';
import { AzureCalendarService } from './azure/azure.calendar.service';

@Processor('calendar')
@Injectable()
export class CalendarProcessor extends WorkerHost {
  private readonly logger = new Logger(CalendarProcessor.name);

  constructor(
    private readonly em: EntityManager,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly azureCalendarService: AzureCalendarService,
  ) {
    super();
  }

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
    const payload = delivery.payload as any;
    const provider = payload.provider;
    const session = payload.session;

    try {
      let response;
      if (provider === 'google') {
        response = await this.googleCalendarService.setEvent(event, session);
      } else if (provider === 'azure') {
        response = await this.azureCalendarService.setEvent(event, session);
      } else {
        throw new Error('calendar.unknownProvider');
      }

      // Success
      const success = await em.findOne(EventDeliveryStatusItem, {
        handle: 'success',
      });

      if (success) {
        delivery.status = success;
        delivery.responseStatusCode = response?.status || 200;
        delivery.responseBody = response?.data || response;
        delivery.responseHeaders = response?.headers;
        delivery.completedAt = new Date();
        await em.flush();
        this.logger.log(`Calendar delivery #${deliveryId} sent successfully.`);
      }
    } catch (error: any) {
      // Failure
      const failed = await em.findOne(EventDeliveryStatusItem, {
        handle: 'failed',
      });

      if (failed) {
        delivery.status = failed;
        delivery.completedAt = new Date();
        if (error.response) {
          delivery.responseStatusCode = error.response.status;
          delivery.responseBody = error.response.data;
          delivery.responseHeaders = error.response.headers;
        } else {
          delivery.responseBody = { error: error.message };
        }
        await em.flush();
        this.logger.error(`Calendar delivery #${deliveryId} failed.`, error);
      }

      throw error;
    }
  }
}
