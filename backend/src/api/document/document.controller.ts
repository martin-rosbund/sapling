import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  Param,
  Get,
  Res,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentService } from './document.service';
import type { Response } from 'express';
import { ENTITY_REGISTRY } from '../../entity/global/entity.registry';
import { ApiGenericEntityOperation } from '../generic/generic.decorator';

@ApiTags('document')
@Controller('document')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('upload/:entityName')
  @ApiOperation({ summary: 'Upload a document' })
  @ApiConsumes('multipart/form-data')
  @ApiGenericEntityOperation('Returns a paginated list for an entity')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        typeHandle: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
      },
      required: ['file', 'typeHandle'],
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('entityName') entityName: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('typeHandle') typeHandle: string,
    @Body('description') description?: string,
  ) {
    return this.documentService.uploadDocument(
      file,
      entityName,
      typeHandle,
      description,
    );
  }

  @Get('download/:entityName/:guid')
  @ApiOperation({ summary: 'Download a document' })
  @ApiParam({
    name: 'entityName',
      type: 'string',
      description: `Entity name. Possible values: ${ENTITY_REGISTRY.map((e) => e.name).join(', ')}`,
      enum: ENTITY_REGISTRY.map((e) => e.name),
  })
  @ApiParam({ name: 'guid', type: 'string', description: 'Document GUID' })
  @ApiResponse({ status: 200, description: 'Document file', schema: { type: 'string', format: 'binary' } })
  async download(
    @Param('entityName') entityName: string,
    @Param('guid') guid: string,
    @Res() res: Response,
  ) {
    const { filePath, document } = await this.documentService.downloadDocument(
      guid,
      entityName,
    );
    res.setHeader('Content-Type', document.mimetype);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${document.filename}"`,
    );
    res.sendFile(filePath);
  }
}
