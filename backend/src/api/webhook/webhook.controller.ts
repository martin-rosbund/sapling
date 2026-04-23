// webhook.controller.ts
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/core';
import { WebhookService } from './webhook.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { SessionOrBearerAuthGuard } from '../../auth/guard/session-or-token-auth.guard';
import {
  GENERIC_PERMISSION_RESOLVE_KEY,
  GenericPermission,
} from '../generic/generic.decorator';
import { GenericPermissionGuard } from '../../auth/guard/generic-permission.guard';
import { WebhookSubscriptionItem } from '../../entity/WebhookSubscriptionItem';
import { WebhookDeliveryItem } from '../../entity/WebhookDeliveryItem';

const resolveWebhookSubscriptionPermission = async (
  req: Request<{ handle?: string }>,
  em: EntityManager,
) => {
  const subscription = await em.findOne(
    WebhookSubscriptionItem,
    { handle: Number(req.params.handle) },
    { populate: ['entity'] },
  );

  if (!subscription?.entity) {
    throw new NotFoundException('global.notFound');
  }

  return {
    entityHandle:
      typeof subscription.entity === 'object'
        ? subscription.entity.handle
        : undefined,
  };
};

const resolveWebhookDeliveryPermission = async (
  req: Request<{ handle?: string }>,
  em: EntityManager,
) => {
  const delivery = await em.findOne(
    WebhookDeliveryItem,
    { handle: Number(req.params.handle) },
    { populate: ['subscription.entity'] },
  );

  const subscription =
    typeof delivery?.subscription === 'object' ? delivery.subscription : null;
  const entity =
    subscription && typeof subscription.entity === 'object'
      ? subscription.entity
      : null;

  if (!entity) {
    throw new NotFoundException('global.notFound');
  }

  return { entityHandle: entity.handle };
};

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
  @UseGuards(GenericPermissionGuard)
  @GenericPermission('allowUpdate')
  @SetMetadata(
    GENERIC_PERMISSION_RESOLVE_KEY,
    resolveWebhookSubscriptionPermission,
  )
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
  @UseGuards(GenericPermissionGuard)
  @GenericPermission('allowUpdate')
  @SetMetadata(GENERIC_PERMISSION_RESOLVE_KEY, resolveWebhookDeliveryPermission)
  async retryDelivery(@Param('handle') handle: number) {
    const delivery = await this.webhookService.retryDelivery(handle);
    return {
      message: 'Webhook retry queued',
      deliveryId: delivery.handle,
      attempt: delivery.attemptCount,
    };
  }
}
