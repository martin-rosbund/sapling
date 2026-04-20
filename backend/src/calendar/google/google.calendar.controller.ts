/**
 * @class GoogleCalendarController
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Controller for Google Calendar API endpoints. Handles event queuing for Google Calendar.
 *
 * @property        {GoogleCalendarService} googleCalendarService Service for Google Calendar integration
 *
 * @method          triggerEvent            Queues a Google calendar event for delivery
 */
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { EventItem } from '../../entity/EventItem';
import { GoogleCalendarService } from './google.calendar.service';
import { PersonItem } from '../../entity/PersonItem';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SessionOrBearerAuthGuard } from '../../auth/session-or-token-auth.guard';

@ApiTags('Google Calendar')
@ApiBearerAuth()
@Controller('api/google')
@UseGuards(SessionOrBearerAuthGuard)
export class GoogleCalendarController {
  /**
   * Creates a new GoogleCalendarController.
   * @param {GoogleCalendarService} googleCalendarService Service for Google Calendar integration
   */
  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  /**
   * Queues a Google calendar event for delivery.
   * @param {Request & { user: PersonItem }} req Request object containing user session
   * @param {EventItem} event Event to queue
   * @returns {Promise<object>} Response with jobId
   */
  @Post('event')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Queue a Google calendar event' })
  @ApiResponse({ status: 202, description: 'Google calendar event queued' })
  async triggerEvent(
    @Req() req: Request & { user: PersonItem },
    @Body() event: EventItem,
  ) {
    if (!req.user.session) {
      throw new UnauthorizedException('global.authenticationFailed');
    }
    const job = await this.googleCalendarService.queueEvent(
      event,
      req.user.session,
    );
    return {
      message: 'Google calendar event queued',
      jobId: job?.handle,
    };
  }
}
