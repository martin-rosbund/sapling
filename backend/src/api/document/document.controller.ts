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

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Controller for document operations, including upload and download endpoints.
 *
 * @property        {DocumentService} documentService  Service handling document logic
 *
 * @method          upload     Uploads a document for a given entity and reference
 * @method          download   Downloads a document by handle
 */
@ApiTags('Document')
@Controller('api/document')
export class DocumentController {
  /**
   * Service handling document logic.
   * @type {DocumentService}
   */
  constructor(private readonly documentService: DocumentService) {}

  /**
   * Uploads a document for a given entity and reference.
   * @param entityHandle Name of the entity
   * @param reference Reference handle
   * @param file Uploaded file
   * @param typeHandle Type handle for the document
   * @param description Optional description
   * @returns Uploaded DocumentItem
   */
  @Post('upload/:entityHandle/:reference')
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
    @Param('entityHandle') entityHandle: string,
    @Param('reference') reference: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('typeHandle') typeHandle: string,
    @Body('description') description?: string,
  ) {
    return this.documentService.uploadDocument(
      file,
      entityHandle,
      reference,
      typeHandle,
      description,
    );
  }

  /**
   * Downloads a document by handle.
   * @param handle Document handle
   * @param res Express response object
   */
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
