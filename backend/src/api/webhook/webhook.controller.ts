// webhook.controller.ts
import { Controller, Post, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { WebhookService } from './webhook.service';

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  // 1. Manuelles Auslösen einer Subscription (z.B. durch ein Event im System)
  @Post('trigger/:handle')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerWebhook(
    @Param('handle') handle: number,
    @Body() body: { payload: any },
  ) {
    // Wir warten hier nicht zwingend auf das Ergebnis, sondern starten den Prozess
    const delivery = await this.webhookService.triggerSubscription(
      handle,
      body.payload,
    );
    return { message: 'Webhook delivery started', deliveryId: delivery.handle };
  }

  // 2. Wiederholen eines fehlgeschlagenen Versands
  @Post('retry/:handle')
  @HttpCode(HttpStatus.ACCEPTED)
  async retryDelivery(@Param('handle') handle: number) {
    const delivery = await this.webhookService.retryDelivery(handle);
    return { message: 'Webhook retry started', deliveryId: delivery.handle, attempt: delivery.attemptCount };
  }
}