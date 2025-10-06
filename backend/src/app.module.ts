import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ApiService } from './api/api.service';
import { ApiController } from './api/api.controller';
import { ApiModule } from './api/api.module';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import mikroOrmConfig from './database/mikro-orm.config';

@Module({
  imports: [MikroOrmModule.forRoot(mikroOrmConfig), ApiModule, AuthModule],
  controllers: [AppController, ApiController],
  providers: [AppService, ApiService],
})
export class AppModule {}
