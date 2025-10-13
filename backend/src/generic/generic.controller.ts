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
import { GenericService } from './generic.service';
import { PaginatedQueryDto } from './query.dto';
import { ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { PaginatedResponseDto } from './paginated-response.dto';
import { ApiGenericEntityOperation } from './generic.decorator';

@Controller('generic')
export class GenericController {
  constructor(private readonly genericService: GenericService) {}

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

  // Beschreibt den optionalen orderBy-Query-Parameter
  @ApiQuery({
    name: 'orderBy',
    required: false,
    description:
      'Ein JSON-String für Sortierung, z.B. {"name":"ASC","createdAt":"DESC"}',
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
    const { page, limit, filter, orderBy } = query;
    return this.genericService.findAndCount(
      entityName,
      filter,
      page,
      limit,
      orderBy,
    );
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
    return this.genericService.create(entityName, createData);
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
    return this.genericService.update(entityName, pk, updateData);
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
    await this.genericService.delete(entityName, pk);
  }

  @Get(':entityName/template')
  @ApiGenericEntityOperation(
    'Gibt die Eigenschaften (Spalten) einer Entität zurück',
  )
  @ApiResponse({
    status: 200,
    description: 'Metadaten der Entität',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { type: 'string' },
          length: { type: 'number', nullable: true },
          nullable: { type: 'boolean' },
          default: { type: 'any', nullable: true },
          isPrimaryKey: { type: 'boolean' },
        },
      },
    },
  })
  async getEntityTemplate(@Param('entityName') entityName: string) {
    return this.genericService.getEntityTemplate(entityName);
  }
}
