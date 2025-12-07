// webhook.module.ts
import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { HttpModule } from '@nestjs/axios';
import { WebhookSubscriptionItem } from 'src/entity//WebhookSubscriptionItem';
import { WebhookDeliveryItem } from 'src/entity/WebhookDeliveryItem';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [
    // Registriere die Entities für Dependency Injection
    MikroOrmModule.forFeature([WebhookSubscriptionItem, WebhookDeliveryItem]),
    // Wichtig für ausgehende HTTP Requests
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService], // Exportieren, falls andere Module Events feuern wollen
})
export class WebhookModule {}