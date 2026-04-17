import { Module } from '@nestjs/common';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';
import { AuthModule } from '../../auth/auth.module';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Module for entity template feature (controller + service).
 *
 * @property        controllers         Controllers used in this module (TemplateController)
 * @property        providers           Providers used in this module (TemplateService)
 * @property        exports             Exported services (TemplateService)
 */

@Module({
  imports: [AuthModule],
  controllers: [TemplateController],
  providers: [TemplateService],
  exports: [TemplateService],
})
export class TemplateModule {}
