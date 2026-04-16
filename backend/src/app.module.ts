import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GithubModule } from './api/github/github.module';
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
import { WebhookModule } from './api/webhook/webhook.module';
import { ScriptModule } from './api/script/script.module';
import { BullModule } from '@nestjs/bullmq';
import {
  REDIS_ENABLED,
  REDIS_PASSWORD,
  REDIS_PORT,
  REDIS_SERVER,
  REDIS_USERNAME,
} from './constants/project.constants';
import { GoogleCalendarModule } from './calendar/google/google.calendar.module';
import { AzureCalendarModule } from './calendar/azure/azure.calendar.module';

import { DocumentModule } from './api/document/document.module';
import { MailModule } from './api/mail/mail.module';

/**
 * @class AppModule
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Main application module. Configures all controllers, providers, and imported modules for the backend application.
 *
 * @property        {Array} imports         List of imported modules (NestJS, MikroORM, BullMQ, custom modules)
 * @property        {Array} controllers     List of controllers for handling API requests
 * @property        {Array} providers       List of providers (services) for dependency injection
 */

@Module({
  imports: [
    /**
     * Global configuration module (environment variables, .env).
     */
    ConfigModule.forRoot({ isGlobal: true }),

    /**
     * MikroORM module for database connection and entity management.
     */
    MikroOrmModule.forRoot(mikroOrmConfig),

    /**
     * BullMQ module for queue management (enabled if REDIS_ENABLED).
     */
    ...(REDIS_ENABLED
      ? [
          BullModule.forRoot({
            connection: {
              host: REDIS_SERVER,
              port: REDIS_PORT,
              password: REDIS_PASSWORD,
              username: REDIS_USERNAME,
            },
          }),
        ]
      : []),

    /**
     * Custom feature modules (Generic, Auth, Current, KPI, Template, System, Webhook, Script, Calendar, Github, Document).
     */
    GenericModule,
    AuthModule,
    CurrentModule,
    KpiModule,
    TemplateModule,
    SystemModule,
    WebhookModule,
    ScriptModule,
    GoogleCalendarModule,
    AzureCalendarModule,
    GithubModule,
    DocumentModule,
    MailModule,
  ],
  controllers: [
    /**
     * Main application controller and feature controllers.
     */
    AppController,
    GenericController,
    CurrentController,
    KpiController,
    TemplateController,
  ],
  providers: [
    /**
     * Application and feature services for dependency injection.
     */
    AppService,
    GenericService,
    CurrentService,
    KpiService,
    TemplateService,
  ],
})

/**
 * Main application module class.
 * Handles configuration, dependency injection, and module setup.
 */
export class AppModule {}
