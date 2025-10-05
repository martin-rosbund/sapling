import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';

// Importiere alle Entitäten, die über die API verfügbar sein sollen
import { LanguageItem } from '../entity/LanguageItem';
import { TranslationItem } from '../entity/TranslationItem';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      LanguageItem,
      TranslationItem
    ])
  ],
  controllers: [ApiController],
  providers: [ApiService],
})
export class ApiModule {}
