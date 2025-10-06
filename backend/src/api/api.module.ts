import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';

// Importiere alle Entitäten, die über die API verfügbar sein sollen
import { LanguageItem } from '../entity/LanguageItem';
import { TranslationItem } from '../entity/TranslationItem';
import { CompanyItem } from 'src/entity/CompanyItem';
import { PersonItem } from 'src/entity/PersonItem';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      LanguageItem,
      TranslationItem,
      CompanyItem,
      PersonItem,
    ]),
  ],
  controllers: [ApiController],
  providers: [ApiService],
})
export class ApiModule {}
