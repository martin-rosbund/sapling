import { Module } from '@nestjs/common';
import { GenericController } from './generic.controller';
import { GenericService } from './generic.service';
import { TemplateModule } from '../template/template.module';

import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ENTITY_REGISTRY } from '../../entity/global/entity.registry';

// Generisches Modul für CRUD-Operationen auf beliebigen Entitäten
// Generic module for CRUD operations on arbitrary entities
@Module({
  imports: [
    // Type assertion required due to MikroORM typing limitations
    MikroOrmModule.forFeature(
      ENTITY_REGISTRY.map((e) => e.class as new (...args: any[]) => unknown),
    ),
    TemplateModule,
  ],
  controllers: [GenericController],
  providers: [GenericService],
})
export class GenericModule {}
