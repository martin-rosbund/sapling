import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SaplingModule } from './sapling/sapling.module';
import { ApiService } from './api/api.service';
import { ApiController } from './api/api.controller';
import { ApiModule } from './api/api.module';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AzureStrategy } from './azure/azure.strategy';
import { AzureController } from './azure/azure.controller';
import { AzureModule } from './azure/azure.module';
import mikroOrmConfig from './database/mikro-orm.config';
import { SaplingStrategy } from './sapling/sapling.strategy';
import { SaplingController } from './sapling/sapling.controller';
import { SaplingService } from './sapling/sapling.service';
import { SessionSerializer } from './session/session.serializer';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    MikroOrmModule.forRoot(mikroOrmConfig),
    SaplingModule,
    ApiModule,
    AzureModule,
    AuthModule,
  ],
  controllers: [
    AppController,
    ApiController,
    AzureController,
    SaplingController,
    AuthController,
  ],
  providers: [
    AppService,
    ApiService,
    AzureStrategy,
    SaplingStrategy,
    SaplingService,
    SessionSerializer,
    AuthService,
  ],
})
export class AppModule {}
