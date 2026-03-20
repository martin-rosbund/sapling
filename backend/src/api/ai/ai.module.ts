import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Module for AI operations, including controller and service registration.
 *
 * @property        {AiController} AiController  Controller for AI endpoints
 * @property        {AiService} AiService        Service for AI logic
 */
@Module({
  providers: [AiService],
  controllers: [AiController],
  exports: [AiService],
})
export class AiModule {}
