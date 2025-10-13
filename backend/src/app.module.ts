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

@Module({
  imports: [
    MikroOrmModule.forRoot(mikroOrmConfig),
    GenericModule,
    AuthModule,
    CurrentModule,
  ],
  controllers: [AppController, GenericController, CurrentController],
  providers: [AppService, GenericService, CurrentService],
})
export class AppModule {}
