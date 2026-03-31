/**
 * @class AzureCalendarController
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Controller for Azure Calendar API endpoints. Handles event queuing for Azure Calendar.
 *
 * @property        {AzureCalendarService} azureCalendarService Service for Azure Calendar integration
 *
 * @method          triggerEvent            Queues an Azure calendar event for delivery
 */
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { EventItem } from '../../entity/EventItem';
import { AzureCalendarService } from './azure.calendar.service';
import { PersonItem } from '../../entity/PersonItem';

@Controller('api/azure')
export class AzureCalendarController {
  /**
   * Creates a new AzureCalendarController.
   * @param {AzureCalendarService} azureCalendarService Service for Azure Calendar integration
   */
  constructor(private readonly azureCalendarService: AzureCalendarService) {}

  /**
   * Queues an Azure calendar event for delivery.
   * @param {Request & { user: PersonItem }} req Request object containing user session
   * @param {EventItem} event Event to queue
   * @returns {Promise<object>} Response with jobId
   */
  @Post('event')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerEvent(
    @Req() req: Request & { user: PersonItem },
    @Body() event: EventItem,
  ) {
    if (!req.user.session) {
      throw new Error('global.authenticationFailed');
    }
    const job = await this.azureCalendarService.queueEvent(
      event,
      req.user.session,
    );
    return {
      message: 'Azure calendar event queued',
      jobId: job?.handle,
    };
  }
}
