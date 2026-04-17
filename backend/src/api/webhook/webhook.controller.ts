// webhook.controller.ts
import {
  Controller,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { WebhookService } from './webhook.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SessionOrBearerAuthGuard } from '../../auth/session-or-token-auth.guard';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Controller for webhook endpoints (trigger, retry).
 *
 * @property        webhookService       Service for webhook logic
 * @method          triggerWebhook       Triggers webhook delivery for a subscription
 * @method          retryDelivery        Retries webhook delivery for a given handle
 */
@ApiTags('Webhook')
@ApiBearerAuth()
@Controller('api/webhooks')
@UseGuards(SessionOrBearerAuthGuard)
export class WebhookController {
  /**
   * Initializes the WebhookController with WebhookService.
   * @param webhookService Service for webhook logic
   */
  constructor(private readonly webhookService: WebhookService) {}

  /**
   * Triggers webhook delivery for a subscription.
   * @param handle Subscription handle
   * @param body Payload object for webhook
   * @returns Delivery status and ID
   * @route POST /api/webhooks/trigger/:handle
   * @access Protected
   */
  @Post('trigger/:handle')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger webhook delivery' })
  @ApiBody({
    description:
      'JSON object with the fields of the entity to trigger the webhook for.',
    required: true,
    schema: { example: { payload: {} } },
  })
  @ApiResponse({ status: 202, description: 'Webhook delivery queued' })
  async triggerWebhook(
    @Param('handle') handle: number,
    @Body() body: { payload: object },
  ) {
    const delivery = await this.webhookService.querySubscription(
      handle,
      body.payload,
    );
    return {
      message: 'Webhook delivery queued',
      deliveryId: delivery.handle,
    };
  }

  /**
   * Retries webhook delivery for a given handle.
   * @param handle Delivery handle
   * @returns Delivery status, ID, and attempt count
   * @route POST /api/webhooks/retry/:handle
   * @access Protected
   */
  @Post('retry/:handle')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Retry webhook delivery' })
  @ApiResponse({ status: 202, description: 'Webhook retry queued' })
  async retryDelivery(@Param('handle') handle: number) {
    const delivery = await this.webhookService.retryDelivery(handle);
    return {
      message: 'Webhook retry queued',
      deliveryId: delivery.handle,
      attempt: delivery.attemptCount,
    };
  }
}
