import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';

// Importiere alle Entitäten, die über die API verfügbar sein sollen
import { LanguageItem } from '../entity/LanguageItem';
import { TranslationItem } from '../entity/TranslationItem';
import { CompanyItem } from 'src/entity/CompanyItem';
import { PersonItem } from 'src/entity/PersonItem';
import { NoteItem } from 'src/entity/NoteItem';
import { EntityItem } from 'src/entity/EntityItem';
import { RoleItem } from 'src/entity/RoleItem';
import { PermissionItem } from 'src/entity/PermissionItem';
import { RightItem } from 'src/entity/RightItem';
import { TicketItem } from 'src/entity/TicketItem';
import { TicketPriorityItem } from 'src/entity/TicketPriorityItem';
import { TicketStatusItem } from 'src/entity/TicketStatusItem';
import { ContractItem } from 'src/entity/ContractItem';
import { ProductItem } from 'src/entity/ProductItem';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      CompanyItem,
      ContractItem,
      EntityItem,
      RoleItem,
      LanguageItem,
      NoteItem,
      PermissionItem,
      PersonItem,
      ProductItem,
      RightItem,
      TicketItem,
      TicketPriorityItem,
      TicketStatusItem,
      TranslationItem,
    ]),
  ],
  controllers: [ApiController],
  providers: [ApiService],
})
export class ApiModule {}
