import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoginModule } from './login/login.module';
import { ApiService } from './api/api.service';
import { ApiController } from './api/api.controller';
import { ApiModule } from './api/api.module';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import mikroOrmConfig from './database/mikro-orm.config';

@Module({
  imports: [MikroOrmModule.forRoot(mikroOrmConfig),LoginModule, ApiModule],
  controllers: [AppController, ApiController],
  providers: [AppService, ApiService],
})
export class AppModule {}
