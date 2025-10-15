import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { GenericService } from './generic/generic.service';
import { GenericController } from './generic/generic.controller';
import { GenericModule } from './generic/generic.module';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { CurrentController } from './current/current.controller';
import { CurrentService } from './current/current.service';
import { CurrentModule } from './current/current.module';
import mikroOrmConfig from './database/mikro-orm.config';
import { KpiService } from './kpi/kpi.service';
import { KpiModule } from './kpi/kpi.module';
import { KpiController } from './kpi/kpi.controller';
import { TemplateService } from './template/template.service';
import { TemplateController } from './template/template.controller';
import { TemplateModule } from './template/template.module';

@Module({
  imports: [
    MikroOrmModule.forRoot(mikroOrmConfig),
    GenericModule,
    AuthModule,
    CurrentModule,
    KpiModule,
    TemplateModule,
  ],
  controllers: [AppController, GenericController, CurrentController, KpiController, TemplateController],
  providers: [AppService, GenericService, CurrentService, KpiService, TemplateService],
})
export class AppModule {}
