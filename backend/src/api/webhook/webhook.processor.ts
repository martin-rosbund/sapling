import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EntityManager } from '@mikro-orm/core';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { WebhookDeliveryItem } from '../../entity/WebhookDeliveryItem';
import { WebhookDeliveryStatusItem } from '../../entity/WebhookDeliveryStatusItem';
import { WebhookSubscriptionItem } from '../../entity/WebhookSubscriptionItem';
import { WebhookAuthenticationOAuth2Item } from '../../entity/WebhookAuthenticationOAuth2Item';

type JsonRecord = Record<string, unknown>;

type HttpResponseLike = {
  status?: number;
  data?: unknown;
  headers?: unknown;
};

type OAuthTokenResponse = {
  access_token: string;
  expires_in?: number;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
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

function parseOAuthTokenResponse(data: unknown): OAuthTokenResponse | null {
  if (!isRecord(data) || typeof data.access_token !== 'string') {
    return null;
  }

  return {
    access_token: data.access_token,
    expires_in:
      typeof data.expires_in === 'number' ? data.expires_in : undefined,
  };
}

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Processor for webhook jobs (delivery, retry, authentication).
 *
 * @property        em                   EntityManager for database access
 * @property        httpService          HttpService for making HTTP requests
 * @property        logger               Logger for logging webhook processing
 * @method          constructor          Initializes the processor with EntityManager and HttpService
 * @method          process              Processes webhook delivery jobs
 * @method          resolveAuthHeaders   Resolves authentication headers for webhook requests
 * @method          getOAuth2Token       Retrieves OAuth2 token for webhook authentication
 */
@Processor('webhooks')
export class WebhookProcessor extends WorkerHost {
  /**
   * Logger for webhook processing.
   * @type {Logger}
   */
  private readonly logger = new Logger(WebhookProcessor.name);

  //#region Constructor
  /**
   * Initializes the WebhookProcessor with EntityManager and HttpService.
   * @param em EntityManager for database access
   * @param httpService HttpService for making HTTP requests
   */
  constructor(
    private readonly em: EntityManager,
    private readonly httpService: HttpService,
  ) {
    super();
  }
  //#endregion

  //#region Process
  /**
   * Processes webhook delivery jobs.
   * Forks EntityManager for clean state, resolves authentication, signs payload, sends HTTP request, updates delivery status.
   * @param job BullMQ job containing deliveryId
   * @returns Promise resolving when job is processed
   */
  async process(job: Job<{ deliveryId: number }>): Promise<any> {
    // ...existing code...
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
          'subscription.authenticationBasic',
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
      let subscriptionUrl = subscription.url;

      // 2. Signieren
      const signature = crypto
        .createHmac('sha256', subscription.signingSecret ?? '')
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

      if (
        subscription.payloadType.handle == 'item' &&
        Array.isArray(delivery.payload)
      ) {
        const itemPayload = (delivery.payload as unknown[])[0];

        if (isRecord(itemPayload)) {
          delivery.payload = itemPayload;

          // Replace {{...}} placeholders in the URL with properties from the payload object
          subscriptionUrl = subscriptionUrl.replace(
            /\{\{(.*?)\}\}/g,
            (match: string, propName: string) => {
              const propValue = itemPayload[propName];
              return propValue !== undefined &&
                (typeof propValue === 'string' ||
                  typeof propValue === 'number' ||
                  typeof propValue === 'boolean')
                ? Buffer.from(String(propValue)).toString('base64')
                : match;
            },
          );
        }
      }

      // 3. Request
      let response: HttpResponseLike | null = null;
      switch (subscription.method.handle) {
        case 'put': {
          const httpResponse = await firstValueFrom(
            this.httpService.put(subscriptionUrl, delivery.payload, {
              headers,
            }),
          );
          response = toHttpResponseLike(httpResponse);
          break;
        }
        case 'patch': {
          const httpResponse = await firstValueFrom(
            this.httpService.patch(subscriptionUrl, delivery.payload, {
              headers,
            }),
          );
          response = toHttpResponseLike(httpResponse);
          break;
        }
        case 'delete': {
          const url = new URL(subscriptionUrl);
          if (delivery.payload && typeof delivery.payload === 'object') {
            Object.entries(delivery.payload).forEach(([key, value]) => {
              if (Array.isArray(value)) {
                value.forEach((v) => url.searchParams.append(key, String(v)));
              } else if (value !== undefined && value !== null) {
                url.searchParams.append(key, String(value));
              }
            });
          }
          const httpResponse = await firstValueFrom(
            this.httpService.delete(url.toString(), {
              headers,
            }),
          );
          response = toHttpResponseLike(httpResponse);
          break;
        }
        default: {
          const httpResponse = await firstValueFrom(
            this.httpService.post(subscriptionUrl, delivery.payload, {
              headers,
            }),
          );
          response = toHttpResponseLike(httpResponse);
          break;
        }
      }

      // 4. Success
      const success = await em.findOne(WebhookDeliveryStatusItem, {
        handle: 'success',
      });

      if (success) {
        delivery.status = success;
        delivery.responseStatusCode = response?.status;
        delivery.responseBody = toPersistedObject(response?.data);
        delivery.responseHeaders = toPersistedObject(response?.headers);
        delivery.completedAt = new Date();

        await em.flush();
        this.logger.log(`Webhook #${deliveryId} sent successfully.`);
      }
    } catch (error: unknown) {
      // 5. Error handling
      const failed = await em.findOne(WebhookDeliveryStatusItem, {
        handle: 'failed',
      });

      if (failed) {
        delivery.status = failed;
        delivery.completedAt = new Date(); // Status is initially Failed

        const errorResponse = getErrorResponse(error);

        if (errorResponse) {
          delivery.responseStatusCode = errorResponse.status;
          delivery.responseBody = toPersistedObject(errorResponse.data);
          delivery.responseHeaders = toPersistedObject(errorResponse.headers);
        } else {
          delivery.responseBody = { error: getErrorMessage(error) };
        }

        await em.flush();
      }

      throw error;
    }
  }
  //#endregion

  //#region Header
  /**
   * Resolves authentication headers for webhook requests.
   * Supports API key, OAuth2, Basic, or no authentication.
   * @param subscription WebhookSubscriptionItem entity
   * @param em EntityManager for database access
   * @returns Record of authentication headers
   */
  private async resolveAuthHeaders(
    subscription: WebhookSubscriptionItem,
    em: EntityManager,
  ): Promise<Record<string, string>> {
    switch (subscription.authenticationType.handle) {
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
      case 'basic': {
        if (!subscription.authenticationBasic) return {};
        const basicAuth = Buffer.from(
          `${subscription.authenticationBasic.username}:${subscription.authenticationBasic.password}`,
        ).toString('base64');
        return {
          Authorization: `Basic ${basicAuth}`,
        };
      }
      case 'none':
      default:
        return {};
    }
  }
  //#endregion

  //#region oAuth 2.0
  /**
   * Retrieves OAuth2 token for webhook authentication.
   * Caches token and sets expiry, persists to DB.
   * @param config WebhookAuthenticationOAuth2Item entity
   * @param subscription WebhookSubscriptionItem entity
   * @param em EntityManager for database access
   * @returns Record containing Authorization header
   */
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
            client_secret: config.clientSecret ?? '',
            scope: config.scope || '',
          }),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        ),
      );

      const tokenPayload = parseOAuthTokenResponse(tokenResponse.data);

      if (tokenPayload) {
        const accessToken = tokenPayload.access_token;
        const expiresIn = tokenPayload.expires_in ?? 3600;

        config.cachedToken = accessToken;
        const expiryDate = new Date();
        expiryDate.setSeconds(expiryDate.getSeconds() + expiresIn - 60);
        config.tokenExpiresAt = expiryDate;

        await em.persist(subscription).flush();

        return { Authorization: `Bearer ${accessToken}` };
      } else {
        throw new Error('global.authenticationFailed');
      }
    } catch (error: unknown) {
      this.logger.error('Failed to fetch OAuth token', error);
      throw new Error('global.authenticationFailed', {
        cause: error,
      });
    }
  }
  //#endregion
}
