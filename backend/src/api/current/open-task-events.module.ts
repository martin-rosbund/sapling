import { Module } from '@nestjs/common';
import { OpenTaskEventsService } from './open-task-events.service';

@Module({
  providers: [OpenTaskEventsService],
  exports: [OpenTaskEventsService],
})
export class OpenTaskEventsModule {}
