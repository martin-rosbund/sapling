import { Module } from '@nestjs/common';
import { CurrentController } from './current.controller';
import { CurrentService } from './current.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ENTITY_REGISTRY } from '../../entity/global/entity.registry';

// Module for current user feature (controller + service)

@Module({
  imports: [
    MikroOrmModule.forFeature(
      ENTITY_REGISTRY.map((e) => e.class as new () => any),
    ),
  ],
  controllers: [CurrentController],
  providers: [CurrentService],
})
export class CurrentModule {}
