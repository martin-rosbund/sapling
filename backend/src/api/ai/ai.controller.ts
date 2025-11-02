import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('ask')
  async ask(@Body('question') question: string) {
    return { answer: await this.aiService.ask(question) };
  }

  @Post('entity')
  async createEntity(@Body() body: { entityType: string; data: any }) {
    return await this.aiService.createEntity(body.entityType, body.data);
  }
}
