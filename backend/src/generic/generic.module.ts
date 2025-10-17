import { Module } from '@nestjs/common';
import { GenericController } from './generic.controller';
import { GenericService } from './generic.service';
import { TemplateModule } from 'src/template/template.module';

import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ENTITY_REGISTRY } from './entity-registry';

@Module({
  imports: [
    MikroOrmModule.forFeature(ENTITY_REGISTRY.map((e) => e.class)),
    TemplateModule,
  ],
  controllers: [GenericController],
  providers: [GenericService],
})
export class GenericModule {}
