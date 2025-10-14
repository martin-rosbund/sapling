import { Module } from '@nestjs/common';
import { GenericController } from './generic.controller';
import { GenericService } from './generic.service';

import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ENTITY_REGISTRY } from './entity-registry';
import { KPIService } from './kpi.service';

@Module({
  imports: [MikroOrmModule.forFeature(ENTITY_REGISTRY.map((e) => e.class))],
  controllers: [GenericController],
  providers: [GenericService, KPIService],
})
export class GenericModule {}
