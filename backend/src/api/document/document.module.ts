import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ENTITY_REGISTRY } from '../../entity/global/entity.registry';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Module for document operations, including controller and service registration.
 *
 * @property        {DocumentController} DocumentController  Controller for document endpoints
 * @property        {DocumentService} DocumentService        Service for document logic
 */
@Module({
  imports: [
    MikroOrmModule.forFeature(
      ENTITY_REGISTRY.map((e) => e.class as new (...args: any[]) => unknown),
    ),
  ],
  controllers: [DocumentController],
  providers: [DocumentService],
})
export class DocumentModule {}
