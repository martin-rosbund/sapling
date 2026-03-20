import { Module } from '@nestjs/common';
import { GenericController } from './generic.controller';
import { GenericService } from './generic.service';
import { TemplateModule } from '../template/template.module';
import { ScriptModule } from '../script/script.module';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ENTITY_REGISTRY } from '../../entity/global/entity.registry';
import { CurrentService } from '../current/current.service';

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
    // Type assertion required due to MikroORM typing limitations
    MikroOrmModule.forFeature(
      ENTITY_REGISTRY.map((e) => e.class as new (...args: any[]) => unknown),
    ),
    TemplateModule,
    ScriptModule,
  ],
  controllers: [GenericController],
  providers: [GenericService, CurrentService],
})
export class GenericModule {}
