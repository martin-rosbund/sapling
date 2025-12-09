import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EntityManager } from '@mikro-orm/core';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { WebhookDeliveryItem } from 'src/entity/WebhookDeliveryItem';
import { WebhookDeliveryStatusItem } from 'src/entity/WebhookDeliveryStatusItem';
import { WebhookSubscriptionItem } from 'src/entity/WebhookSubscriptionItem';
import { WebhookAuthenticationOAuth2Item } from 'src/entity/WebhookAuthenticationOAuth2Item';

@Processor('webhooks')
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    private readonly em: EntityManager,
    private readonly httpService: HttpService,
  ) {
    super();
  }

  async process(job: Job<{ deliveryId: number }>): Promise<any> {
    // Da jeder Job-Run in einem neuen Scope laufen kann/sollte,
    // erstellen wir hier einen Fork des Entity Managers für sauberen State
    const em = this.em.fork();

    const deliveryId = job.data.deliveryId;
    this.logger.debug(
      `Processing webhook delivery #${deliveryId} (Attempt ${job.attemptsMade + 1})`,
    );

    const delivery = await em.findOne(
      WebhookDeliveryItem,
      { handle: deliveryId },
      {
        populate: [
          'subscription',
          'subscription.type',
          'subscription.authenticationApiKey',
          'subscription.authenticationOAuth2',
        ],
      },
    );

    if (!delivery) {
      this.logger.error(`Delivery #${deliveryId} not found in DB`);
      return; // Job abbrechen, da sinnlos
    }

    const subscription = delivery.subscription;
    delivery.attemptCount = job.attemptsMade + 1; // BullMQ Zähler nutzen

    try {
      // 1. Auth Headers
      const authHeaders = await this.resolveAuthHeaders(subscription, em);

      // 2. Signieren
      const signature = crypto
        .createHmac('sha256', subscription.signingSecret)
        .update(JSON.stringify(delivery.payload))
        .digest('hex');

      const headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Event': delivery.subscription.type.handle,
        'X-Webhook-Signature': signature,
        ...authHeaders,
        ...subscription.customHeaders,
      };

      delivery.requestHeaders = headers;

      // 3. Request
      const response = await firstValueFrom(
        this.httpService.post(subscription.url, delivery.payload, { headers }),
      );

      // 4. Erfolg
      const success = await em.findOne(WebhookDeliveryStatusItem, {
        handle: 'success',
      });
      delivery.status = success;
      delivery.responseStatusCode = response.status;
      delivery.responseBody = response.data;
      delivery.responseHeaders = response.headers;
      delivery.completedAt = new Date();

      await em.flush();
      this.logger.log(`Webhook #${deliveryId} sent successfully.`);
    } catch (error: any) {
      // 5. Fehlerbehandlung
      const failed = await em.findOne(WebhookDeliveryStatusItem, {
        handle: 'failed',
      });
      delivery.status = failed;
      delivery.completedAt = new Date(); // Status ist erstmal Failed

      if (error.response) {
        delivery.responseStatusCode = error.response.status;
        delivery.responseBody = error.response.data;
        delivery.responseHeaders = error.response.headers;
      } else {
        delivery.responseBody = { error: error.message };
      }

      await em.flush();
      throw error;
    }
  }

  private async resolveAuthHeaders(
    subscription: WebhookSubscriptionItem,
    em: EntityManager,
  ): Promise<Record<string, string>> {
    const config = subscription.type;

    switch (config.handle) {
      case 'apikey':
        if (!subscription.authenticationApiKey) return {};
        return {
          [subscription.authenticationApiKey.headerName || 'X-Api-Key']:
            subscription.authenticationApiKey.apiKey || '',
        };
      case 'oauth2':
        if (!subscription.authenticationOAuth2) return {};
        return this.getOAuth2Token(
          subscription.authenticationOAuth2,
          subscription,
          em,
        );
      case 'none':
      default:
        return {};
    }
  }

  private async getOAuth2Token(
    config: WebhookAuthenticationOAuth2Item,
    subscription: WebhookSubscriptionItem,
    em: EntityManager,
  ): Promise<Record<string, string>> {
    const now = new Date();
    if (
      config.cachedToken &&
      config.tokenExpiresAt &&
      config.tokenExpiresAt > now
    ) {
      return { Authorization: `Bearer ${config.cachedToken}` };
    }

    try {
      const tokenResponse = await firstValueFrom(
        this.httpService.post(
          config.tokenUrl,
          new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: config.clientId,
            client_secret: config.clientSecret,
            scope: config.scope || '',
          }),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        ),
      );

      if (tokenResponse.data) {
        const accessToken = (tokenResponse.data as { access_token: string })
          .access_token;
        const expiresIn =
          (tokenResponse.data as { expires_in?: number }).expires_in || 3600;

        config.cachedToken = accessToken;
        const expiryDate = new Date();
        expiryDate.setSeconds(expiryDate.getSeconds() + expiresIn - 60);
        config.tokenExpiresAt = expiryDate;

        // Wir nutzen hier den Fork-EM, das ist thread-safe
        await em.persist(subscription).flush();

        return { Authorization: `Bearer ${accessToken}` };
      } else {
        throw new Error('global.authenticationFailed');
      }
    } catch (e) {
      this.logger.error('Failed to fetch OAuth token', e);
      throw new Error('global.authenticationFailed');
    }
  }
}
