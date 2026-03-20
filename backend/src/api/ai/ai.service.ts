import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Service for AI operations, including logic for asking questions and creating entities.
 *
 * @property        {ConfigService} configService  Service for accessing configuration values
 * @property        {'openai'|'gemini'} provider   AI provider type
 * @property        {OpenAI|null} openai           OpenAI client instance
 * @property        {GoogleGenerativeAI|null} gemini Gemini client instance
 *
 * @method          ask          Returns an answer to a question using the configured AI provider
 * @method          createEntity Creates a new entity (example logic, extendable)
 */
@Injectable()
export class AiService {
  /**
   * AI provider type.
   * @type {'openai'|'gemini'}
   */
  private provider: 'openai' | 'gemini';

  /**
   * OpenAI client instance.
   * @type {OpenAI|null}
   */
  private openai: OpenAI | null = null;

  /**
   * Gemini client instance.
   * @type {GoogleGenerativeAI|null}
   */
  private gemini: GoogleGenerativeAI | null = null;

  /**
   * Service for accessing configuration values.
   * @type {ConfigService}
   */
  constructor(private readonly configService: ConfigService) {
    this.provider = this.configService.get<string>('AI_PROVIDER', 'openai') as
      | 'openai'
      | 'gemini';
    if (this.provider === 'openai') {
      this.openai = new OpenAI({
        apiKey: this.configService.get<string>('AI_OPENAI_API_KEY', ''),
      });
    } else if (this.provider === 'gemini') {
      this.gemini = new GoogleGenerativeAI(
        this.configService.get<string>('AI_GEMINI_API_KEY', ''),
      );
    }
  }

  /**
   * Returns an answer to a question using the configured AI provider.
   * @param question The question to ask
   * @returns Answer as a string
   */
  async ask(question: string): Promise<string> {
    if (this.provider === 'openai' && this.openai) {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: question }],
      });
      return response.choices[0]?.message?.content || '';
    } else if (this.provider === 'gemini' && this.gemini) {
      const model = this.gemini.getGenerativeModel({ model: 'gemini-pro' });
      const result = await model.generateContent(question);
      return result.response.text();
    }
    throw new Error('ai.providerNotConfigured');
  }

  /**
   * Creates a new entity (example logic, extendable).
   * @param entityType Type of the entity
   * @param data Data for the entity
   * @returns Created entity object
   */
  createEntity(entityType: string, data: any): any {
    // Logic for entity creation, e.g., DB call or service
    // Extendable for all entities
    return { entityType, ...data, created: true };
  }
}
