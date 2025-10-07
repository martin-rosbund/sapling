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

  @Patch(':entityName')
  @ApiGenericEntityOperation(
    'Aktualisiert einen Eintrag anhand seiner Primary Keys (als Query-Parameter)',
  )
  @ApiResponse({ status: 200, description: 'Eintrag erfolgreich aktualisiert' })
  @ApiQuery({
    name: 'pk',
    required: true,
    description:
      'Primary Key(s) als Query-Parameter, z.B. ?handle=1 oder ?key1=foo&key2=bar',
    type: 'object',
    style: 'deepObject',
    explode: true,
  })
  @ApiBody({
    description: 'JSON-Objekt mit den Feldern der neuen Entität.',
    required: true,
    schema: { type: 'object' },
  })
  async update(
    @Param('entityName') entityName: string,
    @Query() query: Record<string, any>,
    @Body() updateData: object,
  ) {
    // Alle Query-Parameter als PK verwenden (außer page, limit, filter etc.)
    const pk = { ...query };
    delete pk.page;
    delete pk.limit;
    delete pk.filter;
    return this.apiService.update(entityName, pk, updateData);
  }

  @Delete(':entityName')
  @ApiGenericEntityOperation(
    'Löscht einen Eintrag anhand seiner Primary Keys (als Query-Parameter)',
  )
  @ApiResponse({ status: 204, description: 'Eintrag erfolgreich gelöscht' })
  @ApiQuery({
    name: 'pk',
    required: true,
    description:
      'Primary Key(s) als Query-Parameter, z.B. ?handle=1 oder ?key1=foo&key2=bar',
    type: 'object',
    style: 'deepObject',
    explode: true,
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('entityName') entityName: string,
    @Query() query: Record<string, any>,
  ) {
    const pk = { ...query };
    delete pk.page;
    delete pk.limit;
    delete pk.filter;
    await this.apiService.delete(entityName, pk);
  }
}
