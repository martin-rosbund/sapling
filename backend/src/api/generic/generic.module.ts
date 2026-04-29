import { Module } from '@nestjs/common';
import { GenericController } from './generic.controller';
import { GenericFilterService } from './generic-filter.service';
import { GenericMutationService } from './generic-mutation.service';
import { GenericPayloadService } from './generic-payload.service';
import { GenericPermissionService } from './generic-permission.service';
import { GenericQueryService } from './generic-query.service';
import { GenericReadService } from './generic-read.service';
import { GenericRelationService } from './generic-relation.service';
import { GenericReferenceService } from './generic-reference.service';
import { GenericSanitizerService } from './generic-sanitizer.service';
import { GenericService } from './generic.service';
import { GenericTimelineService } from './generic-timeline.service';
import { TemplateModule } from '../template/template.module';
import { ScriptModule } from '../script/script.module';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ENTITY_REGISTRY } from '../../entity/global/entity.registry';
import { CurrentModule } from '../current/current.module';
import { AuthModule } from '../../auth/auth.module';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Module for generic CRUD operations on arbitrary entities. Registers controllers, providers, and imports required modules.
 *
 * @property        {GenericController[]} controllers  Controllers for entity operations
 * @property        {GenericService[]} providers       Providers for business logic
 * @property        {Module[]} imports                 Imported modules for entity, template, and script handling
 */
@Module({
  imports: [
    AuthModule,
    // Type assertion required due to MikroORM typing limitations
    MikroOrmModule.forFeature(
      ENTITY_REGISTRY.map((e) => e.class as new (...args: any[]) => unknown),
    ),
    TemplateModule,
    ScriptModule,
    CurrentModule,
  ],
  controllers: [GenericController],
  providers: [
    GenericService,
    GenericFilterService,
    GenericMutationService,
    GenericPayloadService,
    GenericQueryService,
    GenericReadService,
    GenericRelationService,
    GenericPermissionService,
    GenericReferenceService,
    GenericSanitizerService,
    GenericTimelineService,
  ],
  exports: [GenericService],
})
export class GenericModule {}
