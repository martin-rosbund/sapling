import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuthModule } from '../../auth/auth.module';
import { ENTITY_REGISTRY } from '../../entity/global/entity.registry';
import { CurrentModule } from '../current/current.module';
import { TemplateModule } from '../template/template.module';
import { FormConfigController } from './form-config.controller';
import { FormConfigService } from './form-config.service';

@Module({
  imports: [
    AuthModule,
    CurrentModule,
    TemplateModule,
    MikroOrmModule.forFeature(
      ENTITY_REGISTRY.map((entry) => entry.class as new () => any),
    ),
  ],
  controllers: [FormConfigController],
  providers: [FormConfigService],
  exports: [FormConfigService],
})
export class FormConfigModule {}
