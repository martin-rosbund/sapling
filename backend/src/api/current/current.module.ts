import { Module } from '@nestjs/common';
import { CurrentController } from './current.controller';
import { CurrentService } from './current.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ENTITY_REGISTRY } from 'src/entity/global/entity.registry';

@Module({
  imports: [MikroOrmModule.forFeature(ENTITY_REGISTRY.map((e) => e.class))],
  controllers: [CurrentController],
  providers: [CurrentService],
})
export class CurrentModule {}
