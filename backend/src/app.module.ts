import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { GenericService } from './api/generic/generic.service';
import { GenericController } from './api/generic/generic.controller';
import { GenericModule } from './api/generic/generic.module';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { CurrentController } from './api/current/current.controller';
import { CurrentService } from './api/current/current.service';
import { CurrentModule } from './api/current/current.module';
import mikroOrmConfig from './database/mikro-orm.config';
import { KpiService } from './api/kpi/kpi.service';
import { KpiModule } from './api/kpi/kpi.module';
import { KpiController } from './api/kpi/kpi.controller';
import { TemplateService } from './api/template/template.service';
import { TemplateController } from './api/template/template.controller';
import { TemplateModule } from './api/template/template.module';
import { SystemModule } from './api/system/system.module';

/**
 * Main application module.
 * Configures all controllers, providers, and imported modules for the backend application.
 */
@Module({
  imports: [
    MikroOrmModule.forRoot(mikroOrmConfig),
    GenericModule,
    AuthModule,
    CurrentModule,
    KpiModule,
    TemplateModule,
    SystemModule,
  ],
  controllers: [
    AppController,
    GenericController,
    CurrentController,
    KpiController,
    TemplateController,
  ],
  providers: [
    AppService,
    GenericService,
    CurrentService,
    KpiService,
    TemplateService,
  ],
})
export class AppModule {}
