import { Module } from '@nestjs/common';
import { CurrentController } from './current.controller';
import { CurrentService } from './current.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ENTITY_REGISTRY } from '../../entity/global/entity.registry';
import { AuthModule } from '../../auth/auth.module';

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
    AuthModule,
    MikroOrmModule.forFeature(
      ENTITY_REGISTRY.map((e) => e.class as new () => any),
    ),
  ],
  controllers: [CurrentController],
  providers: [CurrentService],
})
/**
 * Module class for current user feature.
 * @property {CurrentController} CurrentController Controller for current user endpoints
 * @property {CurrentService} CurrentService Service for current user operations
 */
export class CurrentModule {}
