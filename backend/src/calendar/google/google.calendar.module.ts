import { Module } from '@nestjs/common';
import { GoogleCalendarController } from './google.calendar.controller';
import { CalendarModule } from '../calendar.module';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ENTITY_REGISTRY } from 'src/entity/global/entity.registry';
import { getQueueToken } from '@nestjs/bullmq';
import { REDIS_ENABLED } from '../../constants/project.constants';

// MockQueue for offline mode
const MockQueue = {
  add: (name: string, data: any) => {
    global.log?.warn?.(
      `Redis is disabled. Job '${name}' was NOT added. Data: ${JSON.stringify(data)}`,
    );
    return null;
  },
};
@Module({
  imports: [
    CalendarModule,
    MikroOrmModule.forFeature(
      ENTITY_REGISTRY.map((e) => e.class as new () => any),
    ),
  ],
  controllers: [GoogleCalendarController],
  providers: [
    ...(REDIS_ENABLED
      ? []
      : [
          {
            provide: getQueueToken('calendar'),
            useValue: MockQueue,
          },
        ]),
  ],
})
export class GoogleCalendarModule {}
