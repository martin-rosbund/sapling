import { Module } from '@nestjs/common';
import { GoogleCalendarController } from './google.calendar.controller';
import { CalendarModule } from '../calendar.module';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ENTITY_REGISTRY } from 'src/entity/global/entity.registry';

@Module({
  imports: [
    CalendarModule,
    MikroOrmModule.forFeature(
      ENTITY_REGISTRY.map((e) => e.class as new () => any),
    ),
  ],
  controllers: [GoogleCalendarController],
})
export class GoogleCalendarModule {}
