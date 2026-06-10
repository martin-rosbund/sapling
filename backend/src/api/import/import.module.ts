import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuthModule } from '../../auth/auth.module';
import { EntityItem } from '../../entity/EntityItem';
import { ExternalRecordLinkItem } from '../../entity/ExternalRecordLinkItem';
import { ImportBatchItem } from '../../entity/ImportBatchItem';
import { ImportBatchRowItem } from '../../entity/ImportBatchRowItem';
import { ImportSourceItem } from '../../entity/ImportSourceItem';
import { ImportTemplateItem } from '../../entity/ImportTemplateItem';
import { ImportTemplateValueMappingItem } from '../../entity/ImportTemplateValueMappingItem';
import { PersonItem } from '../../entity/PersonItem';
import { AiModule } from '../ai/ai.module';
import { GenericModule } from '../generic/generic.module';
import { TemplateModule } from '../template/template.module';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';

@Module({
  imports: [
    AiModule,
    AuthModule,
    GenericModule,
    TemplateModule,
    MikroOrmModule.forFeature([
      EntityItem,
      ExternalRecordLinkItem,
      ImportBatchItem,
      ImportBatchRowItem,
      ImportSourceItem,
      ImportTemplateItem,
      ImportTemplateValueMappingItem,
      PersonItem,
    ]),
  ],
  controllers: [ImportController],
  providers: [ImportService],
})
export class ImportModule {}
