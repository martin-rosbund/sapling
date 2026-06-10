import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AdminPermission } from '../../auth/admin-permission';
import { AdminPermissionGuard } from '../../auth/guard/admin-permission.guard';
import { SessionOrBearerAuthGuard } from '../../auth/guard/session-or-token-auth.guard';
import { PersonItem } from '../../entity/PersonItem';
import { ImportService } from './import.service';
import type {
  ConfigureImportBatchDto,
  ImportAiSuggestDto,
  ImportAiSuggestionDto,
  ImportBatchSummaryDto,
  ImportTemplateSummaryDto,
  SaveImportTemplateDto,
} from './import.types';

@ApiTags('Import')
@ApiBearerAuth()
@Controller('api/import')
@UseGuards(SessionOrBearerAuthGuard, AdminPermissionGuard)
@AdminPermission()
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('batches/analyze')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async analyzeCsv(
    @Req() req: Request & { user: PersonItem },
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ImportBatchSummaryDto> {
    return this.importService.analyzeCsv(file, req.user);
  }

  @Get('batches/:handle')
  async getBatch(
    @Param('handle') handle: number,
  ): Promise<ImportBatchSummaryDto> {
    return this.importService.getBatch(Number(handle));
  }

  @Get('templates')
  async listTemplates(
    @Query('entityHandle') entityHandle?: string,
    @Query('sourceHandle') sourceHandle?: string,
  ): Promise<ImportTemplateSummaryDto[]> {
    return this.importService.listTemplates(entityHandle, sourceHandle);
  }

  @Post('templates')
  async saveTemplate(
    @Body() body: SaveImportTemplateDto,
  ): Promise<ImportTemplateSummaryDto> {
    return this.importService.saveTemplate(body);
  }

  @Patch('batches/:handle/configure')
  async configureBatch(
    @Req() req: Request & { user: PersonItem },
    @Param('handle') handle: number,
    @Body() body: ConfigureImportBatchDto,
  ): Promise<ImportBatchSummaryDto> {
    return this.importService.configureBatch(Number(handle), body, req.user);
  }

  @Post('batches/:handle/suggest')
  async suggestBatchConfiguration(
    @Param('handle') handle: number,
    @Body() body: ImportAiSuggestDto = {},
  ): Promise<ImportAiSuggestionDto> {
    return this.importService.suggestBatchConfiguration(Number(handle), body);
  }

  @Post('batches/:handle/execute')
  async executeBatch(
    @Req() req: Request & { user: PersonItem },
    @Param('handle') handle: number,
  ): Promise<ImportBatchSummaryDto> {
    return this.importService.executeBatch(Number(handle), req.user);
  }
}
