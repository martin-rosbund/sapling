// webhook.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { WebhookSubscriptionItem } from 'src/entity//WebhookSubscriptionItem';
import { WebhookDeliveryItem } from 'src/entity/WebhookDeliveryItem';
import { WebhookDeliveryStatusItem } from 'src/entity/WebhookDeliveryStatusItem';
import { EntityManager } from '@mikro-orm/mysql';
import { WebhookAuthenticationOAuth2Item } from 'src/entity/WebhookAuthenticationOAuth2Item';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Startet einen neuen Webhook-Versand für eine Subscription
   */
  async triggerSubscription(handle: number, payload: any): Promise<WebhookDeliveryItem> {
    const subscription = await this.em.findOne(WebhookSubscriptionItem, { handle: handle });
    const pending = await this.em.findOne(WebhookDeliveryStatusItem, { handle: 'pending' });
    
    if (!subscription?.isActive) {
      throw new Error('Subscription is not active');
    }

    // Neuen Delivery-Eintrag erstellen
    const delivery = new WebhookDeliveryItem();
    delivery.subscription = subscription;
    delivery.payload = payload;
    delivery.status = pending;

    await this.em.persistAndFlush(delivery);

    // Asynchron ausführen (Feuer und vergessen)
    this.executeDelivery(delivery).catch(err => 
      this.logger.error(`Failed to execute delivery ${delivery.handle}`, err)
    );

    return delivery;
  }

  /**
   * Wiederholt einen existierenden Webhook-Versand
   */
  async retryDelivery(handle: number): Promise<WebhookDeliveryItem> {
    const pending = await this.em.findOne(WebhookDeliveryStatusItem, { handle: 'pending' });
    const delivery = await this.em.findOne(WebhookDeliveryItem,
      { handle: handle },
      { populate: ['subscription'] }
    );

    if (!delivery) {
      throw new Error('Delivery not found');
    }

    delivery.status = pending;
    // Nächster Versuch sofort (oder Logik für nextRetryAt hier einfügen)
    delivery.nextRetryAt = null; 
    
    await this.em.flush();

    this.executeDelivery(delivery).catch(err => 
      this.logger.error(`Failed to retry delivery ${delivery.handle}`, err)
    );

    return delivery;
  }

  /**
   * Die eigentliche Sende-Logik
   */
  private async executeDelivery(delivery: WebhookDeliveryItem): Promise<void> {
    const subscription = delivery.subscription;
    delivery.attemptCount += 1;
    
    try {
      // 1. Authentifizierungs-Header vorbereiten
      const authHeaders = await this.resolveAuthHeaders(subscription);
      
      // 2. Payload Signieren (Sicherheit)
      // Erzeugt einen Hash, damit der Empfänger weiß, dass es von uns kommt
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

      // Snapshot der Header für Logs speichern (ohne Secrets idealerweise maskieren)
      delivery.requestHeaders = headers; 

      // 3. Request senden
      const start = Date.now();
      const response = await firstValueFrom(
        this.httpService.post(subscription.url, delivery.payload, { headers })
      );
      
      // 4. Erfolg verarbeiten
      const success = await this.em.findOne(WebhookDeliveryStatusItem, { handle: 'success' });

      delivery.status = success;
      delivery.responseStatusCode = response.status;
      delivery.responseBody = response.data;
      delivery.completedAt = new Date();

    } catch (error: any) {
      // 5. Fehler verarbeiten
      const success = await this.em.findOne(WebhookDeliveryStatusItem, { handle: 'success' });
      const failed = await this.em.findOne(WebhookDeliveryStatusItem, { handle: 'failed' });

      delivery.status = failed;
      delivery.completedAt = new Date(); // Abgeschlossen, auch wenn fehlgeschlagen

      if (error.response) {
        // Der Server hat geantwortet, aber mit Fehler (4xx, 5xx)
        delivery.responseStatusCode = error.response.status;
        delivery.responseBody = error.response.data;
      } else {
        // Netzwerkfehler (Timeout, DNS, etc.)
        delivery.responseBody = JSON.stringify({ error: error.message });
      }

      // Optional: Hier Logik für automatisches `nextRetryAt` basierend auf Exponential Backoff einfügen
    } finally {
      await this.em.flush();
    }
  }

  /**
   * Ermittelt die nötigen Auth-Header basierend auf der Konfiguration
   */
  private async resolveAuthHeaders(subscription: WebhookSubscriptionItem): Promise<Record<string, string>> {
    const config = subscription.type;

    switch (config.handle) {
      case 'apikey':
        if(!subscription.authenticationApiKey) return {};
        return { [subscription.authenticationApiKey.headerName || 'X-Api-Key']: subscription.authenticationApiKey.apiKey || '' };
      case 'oauth2':
        if(!subscription.authenticationOAuth2) return {};
        return this.getOAuth2Token(subscription.authenticationOAuth2, subscription);
      case 'none':
      default:
        return {};
    }
  }

  /**
   * Holt ein OAuth2 Token (und speichert es ggf. zwischen - hier vereinfacht)
   */
  private async getOAuth2Token(config: WebhookAuthenticationOAuth2Item, subscription: WebhookSubscriptionItem): Promise<Record<string, string>> {
    // Check ob wir noch ein gültiges Token in der Config haben (optionales Caching)
    const now = new Date();
    if (config.cachedToken && config.tokenExpiresAt && config.tokenExpiresAt > now) {
       return { Authorization: `Bearer ${config.cachedToken}` };
    }

    // Neues Token holen
    try {
      const tokenResponse = await firstValueFrom(
        this.httpService.post(config.tokenUrl, new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: config.clientId,
          client_secret: config.clientSecret,
          scope: config.scope || '',
        }), { 
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' } 
        })
      );

      const accessToken = tokenResponse.data.access_token;
      const expiresIn = tokenResponse.data.expires_in || 3600; // Default 1h

      // Token in der Entity cachen um Requests zu sparen
      config.cachedToken = accessToken;
      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + expiresIn - 60); // 60s Buffer
      config.tokenExpiresAt = expiryDate;

      // Wir müssen das Subscription Objekt speichern, da sich die AuthConfig geändert hat
      await this.em.persistAndFlush(subscription);

      return { Authorization: `Bearer ${accessToken}` };
    } catch (e) {
      this.logger.error('Failed to fetch OAuth token', e);
      throw new Error('OAuth authentication failed');
    }
  }
}