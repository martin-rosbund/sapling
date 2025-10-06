import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiService } from './api.service';
import { PaginatedQueryDto } from './query.dto';
import { ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { PaginatedResponseDto } from './paginated-response.dto';
import { ApiGenericEntityOperation } from './api-generic.decorator';

@Controller('api')
export class ApiController {
  constructor(private readonly apiService: ApiService) {}

  @Get(':entityName')
  @ApiGenericEntityOperation('Ruft eine paginierte Liste für eine Entität ab')

  // Beschreibt den optionalen Filter-Query-Parameter
  @ApiQuery({
    name: 'filter',
    required: false,
    description:
      'Ein JSON-String für komplexe WHERE-Bedingungen (z.B. {"name":{"$like":"%Test%"}})',
    type: String,
  })

  // Beschreibt die möglichen Antworten
  @ApiResponse({
    status: 200,
    description: 'Erfolgreiche Anfrage',
    type: PaginatedResponseDto,
  })
  async findPaginated(
    @Param('entityName') entityName: string,
    @Query() query: PaginatedQueryDto, // DTO wird hier automatisch validiert!
  ) {
    const { page, limit, filter } = query;
    return this.apiService.findAndCount(entityName, filter, page, limit);
  }

  @Post(':entityName')
  @ApiGenericEntityOperation('Erstellt einen neuen Eintrag für eine Entität')
  @ApiResponse({ status: 201, description: 'Eintrag erfolgreich erstellt' })
  @ApiBody({
    description: 'JSON-Objekt mit den Feldern der neuen Entität.',
    required: true,
    schema: { type: 'object' },
  })
  async create(
    @Param('entityName') entityName: string,
    @Body() createData: object,
  ) {
    return this.apiService.create(entityName, createData);
  }

  @Patch(':entityName/:id')
  @ApiGenericEntityOperation('Aktualisiert einen Eintrag anhand seiner ID')
  @ApiResponse({ status: 200, description: 'Eintrag erfolgreich aktualisiert' })
  @ApiBody({
    description: 'JSON-Objekt mit den Feldern der neuen Entität.',
    required: true,
    schema: { type: 'object' },
  })
  async update(
    @Param('entityName') entityName: string,
    @Param('id') id: string, // IDs kommen als String von der URL
    @Body() updateData: object,
  ) {
    // MikroORM kann je nach Spaltentyp eine Nummer oder einen String erwarten
    const numericId = isNaN(Number(id)) ? id : Number(id);
    return this.apiService.update(entityName, numericId, updateData);
  }

  @Delete(':entityName/:id')
  @ApiGenericEntityOperation('Löscht einen Eintrag anhand seiner ID')
  @ApiResponse({ status: 204, description: 'Eintrag erfolgreich gelöscht' })
  @HttpCode(HttpStatus.NO_CONTENT) // Sendet einen 204 No Content Status zurück
  async delete(
    @Param('entityName') entityName: string,
    @Param('id') id: string,
  ) {
    const numericId = isNaN(Number(id)) ? id : Number(id);
    await this.apiService.delete(entityName, numericId);
  }
}
