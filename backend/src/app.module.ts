import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ApiService } from './api/api.service';
import { ApiController } from './api/api.controller';
import { ApiModule } from './api/api.module';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { CurrentController } from './current/current.controller';
import { CurrentService } from './current/current.service';
import { CurrentModule } from './current/current.module';
import mikroOrmConfig from './database/mikro-orm.config';

@Module({
  imports: [
    MikroOrmModule.forRoot(mikroOrmConfig),
    ApiModule,
    AuthModule,
    CurrentModule,
  ],
  controllers: [AppController, ApiController, CurrentController],
  providers: [AppService, ApiService, CurrentService],
})
export class AppModule {}
