import { Module } from '@nestjs/common';
import { GenericController } from './generic.controller';
import { GenericService } from './generic.service';
import { TemplateModule } from '../template/template.module';
import { ScriptModule } from '../../script/core/script.module';

import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ENTITY_REGISTRY } from '../../entity/global/entity.registry';
import { CurrentService } from '../current/current.service';
// ...existing code...

// Generisches Modul für CRUD-Operationen auf beliebigen Entitäten
// Generic module for CRUD operations on arbitrary entities
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
  // ...existing code...
})
export class GenericModule {}
