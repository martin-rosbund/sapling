import { Module, forwardRef } from '@nestjs/common';
import { CurrentController } from './current.controller';
import { CurrentService } from './current.service';
import { CurrentMetadataService } from './current-metadata.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ENTITY_REGISTRY } from '../../entity/global/entity.registry';
import { AuthModule } from '../../auth/auth.module';
import { TemplateService } from '../template/template.service';
import { InboxModule } from '../inbox/inbox.module';
import { OpenTaskEventsModule } from './open-task-events.module';
import { FormConfigService } from '../form-config/form-config.service';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Module for current user feature (controller + service)
 *
 * @property        {CurrentController} CurrentController   Controller for current user endpoints
 * @property        {CurrentService} CurrentService         Service for current user operations
 */

@Module({
  imports: [
    forwardRef(() => AuthModule),
    InboxModule,
    OpenTaskEventsModule,
    MikroOrmModule.forFeature(
      ENTITY_REGISTRY.map((e) => e.class as new () => any),
    ),
  ],
  controllers: [CurrentController],
  providers: [
    CurrentService,
    CurrentMetadataService,
    TemplateService,
    FormConfigService,
  ],
  exports: [CurrentService, OpenTaskEventsModule],
})
/**
 * Module class for current user feature.
 * @property {CurrentController} CurrentController Controller for current user endpoints
 * @property {CurrentService} CurrentService Service for current user operations
 */
export class CurrentModule {}
