import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
  private provider: 'openai' | 'gemini';
  private openai: OpenAI | null = null;
  private gemini: GoogleGenerativeAI | null = null;

  constructor(private readonly configService: ConfigService) {
    this.provider = this.configService.get<string>('AI_PROVIDER', 'openai') as 'openai' | 'gemini';
    if (this.provider === 'openai') {
      this.openai = new OpenAI({ apiKey: this.configService.get<string>('AI_OPENAI_API_KEY', '') });
    } else if (this.provider === 'gemini') {
      this.gemini = new GoogleGenerativeAI(this.configService.get<string>('AI_GEMINI_API_KEY', ''));
    }
  }

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
    throw new Error('No AI provider configured');
  }

  // Beispiel: Ticket/Termin anlegen (erweiterbar)
  async createEntity(entityType: string, data: any): Promise<any> {
    // Hier Logik für die Anlage, z.B. DB-Call oder Service
    // Erweiterbar für alle Entitäten
    return { entityType, ...data, created: true };
  }
}
