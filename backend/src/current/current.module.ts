import { Module } from '@nestjs/common';
import { CurrentController } from './current.controller';
import { CurrentService } from './current.service';

@Module({
  controllers: [CurrentController],
  providers: [CurrentService],
})
export class CurrentModule {}
