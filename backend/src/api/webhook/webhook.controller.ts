// webhook.controller.ts
import {
  Controller,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { ApiBody } from '@nestjs/swagger';

@Controller('api/webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('trigger/:handle')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiBody({
    description:
      'JSON object with the fields of the entity to trigger the webhook for.',
    required: true,
    schema: { example: { payload: {} } },
  })
  async triggerWebhook(
    @Param('handle') handle: number,
    @Body() body: { payload: object },
  ) {
    const delivery = await this.webhookService.querySubscription(
      handle,
      body.payload,
    );
    // Info: Der Prozess läuft jetzt asynchron im Hintergrund
    return {
      message: 'Webhook delivery queued',
      deliveryId: delivery.handle,
    };
  }

  @Post('retry/:handle')
  @HttpCode(HttpStatus.ACCEPTED)
  async retryDelivery(@Param('handle') handle: number) {
    const delivery = await this.webhookService.retryDelivery(handle);
    return {
      message: 'Webhook retry queued',
      deliveryId: delivery.handle,
      attempt: delivery.attemptCount,
    };
  }
}
