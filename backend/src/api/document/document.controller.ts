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
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentService } from './document.service';
import type { Response } from 'express';

@Controller('document')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('entityHandle') entityHandle: string,
    @Body('typeHandle') typeHandle: string,
    @Body('description') description?: string,
  ) {
    return this.documentService.uploadDocument(
      file,
      entityHandle,
      typeHandle,
      description,
    );
  }

  @Get('download/:entityName/:guid')
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
