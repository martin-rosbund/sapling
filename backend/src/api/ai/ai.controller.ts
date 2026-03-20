import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Controller for AI operations, including endpoints for asking questions and creating entities.
 *
 * @property        {AiService} aiService  Service handling AI logic
 *
 * @method          ask          Returns an answer to a question using the AI service
 * @method          createEntity Creates a new entity using the AI service
 */
@Controller('api/ai')
export class AiController {
  /**
   * Service handling AI logic.
   * @type {AiService}
   */
  constructor(private readonly aiService: AiService) {}

  /**
   * Returns an answer to a question using the AI service.
   * @param question The question to ask
   * @returns Object containing the answer
   */
  @Post('ask')
  async ask(@Body('question') question: string) {
    return { answer: await this.aiService.ask(question) };
  }

  /**
   * Creates a new entity using the AI service.
   * @param body Object containing entityType and data
   * @returns Created entity object
   */
  @Post('entity')
  async createEntity(@Body() body: { entityType: string; data: any }) {
    return await this.aiService.createEntity(body.entityType, body.data);
  }
}
