import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  Param,
  Get,
  Res,
  Req,
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
import type { Request, Response } from 'express';
import { ApiGenericEntityOperation } from '../generic/generic.decorator';
import { PersonItem } from '../../entity/PersonItem';

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
    @Req() req: Request & { user: PersonItem },
    @UploadedFile() file: Express.Multer.File,
    @Body('typeHandle') typeHandle: string,
    @Body('description') description?: string,
  ) {
    return this.documentService.uploadDocument(
      file,
      entityHandle,
      reference,
      typeHandle,
      req.user,
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
  async download(
    @Param('handle') handle: number,
    @Res() res: Response,
    @Req() req: Request & { user: PersonItem },
  ) {
    const { filePath, document } = await this.documentService.downloadDocument(
      handle,
      req.user,
    );
    res.setHeader('Content-Type', document.mimetype);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${document.filename}"`,
    );
    res.sendFile(filePath);
  }

  /**
   * PDF Vorschau-Endpunkt: Liefert PDF mit Content-Disposition: inline
   * @param handle Document handle
   * @param res Express response object
   */
  @Get('preview/:handle')
  @ApiOperation({ summary: 'Preview a PDF document' })
  @ApiParam({ name: 'handle', type: 'number', description: 'Document Handle' })
  @ApiResponse({
    status: 200,
    description: 'PDF preview',
    schema: { type: 'string', format: 'binary' },
  })
  async preview(
    @Param('handle') handle: number,
    @Res() res: Response,
    @Req() req: Request & { user: PersonItem },
  ) {
    const { filePath, document } = await this.documentService.downloadDocument(
      handle,
      req.user,
    );
    res.setHeader('Content-Type', document.mimetype);
    // PDF Vorschau: Content-Disposition inline
    if (document.mimetype === 'application/pdf') {
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${document.filename}"`,
      );
    } else {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${document.filename}"`,
      );
    }
    res.sendFile(filePath);
  }
}
