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
import { ApiGenericEntityOperation } from '../generic/generic.decorator';

@ApiTags('Document')
@Controller('api/document')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('upload/:entityName/:reference')
  @ApiOperation({ summary: 'Upload a document' })
  @ApiConsumes('multipart/form-data')
  @ApiGenericEntityOperation('Returns a paginated list for an entity')
  @ApiParam({
    name: 'reference',
    type: 'string',
    description: 'Reference Handle',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          nullable: false,
        },
        typeHandle: {
          type: 'string',
          default: 'document',
          nullable: false,
        },
        description: {
          type: 'string',
          default: '',
          nullable: true,
        },
      },
      required: ['file', 'typeHandle'],
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('entityName') entityName: string,
    @Param('reference') reference: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('typeHandle') typeHandle: string,
    @Body('description') description?: string,
  ) {
    return this.documentService.uploadDocument(
      file,
      entityName,
      reference,
      typeHandle,
      description,
    );
  }

  @Get('download/:handle')
  @ApiOperation({ summary: 'Download a document' })
  @ApiParam({ name: 'handle', type: 'number', description: 'Document Handle' })
  @ApiResponse({
    status: 200,
    description: 'Document file',
    schema: { type: 'string', format: 'binary' },
  })
  async download(@Param('handle') handle: number, @Res() res: Response) {
    const { filePath, document } =
      await this.documentService.downloadDocument(handle);
    res.setHeader('Content-Type', document.mimetype);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${document.filename}"`,
    );
    res.sendFile(filePath);
  }
}
