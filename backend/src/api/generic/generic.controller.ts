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
  Req,
  UseGuards,
} from '@nestjs/common';
import { GenericPermissionGuard } from './generic-permission.guard';
import { GenericService } from './generic.service';
import { PaginatedQueryDto, UpdateQueryDto } from './query.dto';
import { ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { PaginatedResponseDto } from './paginated-response.dto';
import { ApiGenericEntityOperation } from './generic.decorator';
import { PersonItem } from 'src/entity/PersonItem';

@Controller('generic')
export class GenericController {
  constructor(private readonly genericService: GenericService) {}

  @UseGuards(GenericPermissionGuard)
  @Get(':entityName')
  @ApiGenericEntityOperation('Ruft eine paginierte Liste für eine Entität ab')

  // Describes the optional filter query parameter
  @ApiQuery({
    name: 'filter',
    required: false,
    description:
      'Ein JSON-String für komplexe WHERE-Bedingungen (z.B. {"name":{"$like":"%Test%"}})',
    type: String,
  })

  // Describes the optional orderBy query parameter
  @ApiQuery({
    name: 'orderBy',
    required: false,
    description:
      'Ein JSON-String für Sortierung, z.B. {"name":"ASC","createdAt":"DESC"}',
    type: String,
  })

  // Describes the optional relations query parameter
  @ApiQuery({
    name: 'relations',
    required: false,
    description:
      'Eine Liste von Referenzen, die geladen werden sollen, z.B. "person, company, etc.".',
    type: String,
  })

  // Describes possible responses
  @ApiResponse({
    status: 200,
    description: 'Erfolgreiche Anfrage',
    type: PaginatedResponseDto,
  })
  async findPaginated(
    @Req() req: Request & { user: PersonItem },
    @Param('entityName') entityName: string,
    @Query() query: PaginatedQueryDto, // DTO wird hier automatisch validiert!
    // DTO is automatically validated here!
  ): Promise<PaginatedResponseDto> {
    const { page, limit, filter, orderBy, relations } = query;
    return this.genericService.findAndCount(
      entityName,
      filter,
      page,
      limit,
      orderBy,
      req.user,
      relations,
    );
  }

  @UseGuards(GenericPermissionGuard)
  @Post(':entityName')
  @ApiGenericEntityOperation('Erstellt einen neuen Eintrag für eine Entität') // Creates a new entry for an entity
  @ApiResponse({ status: 201, description: 'Eintrag erfolgreich erstellt' })
  @ApiBody({
    description: 'JSON-Objekt mit den Feldern der neuen Entität.', // JSON object with the fields of the new entity
    required: true,
    schema: { type: 'object' },
  })
  async create(
    @Req() req: Request & { user: PersonItem },
    @Param('entityName') entityName: string,
    @Body() createData: object,
  ): Promise<any> {
    return this.genericService.create(entityName, createData, req.user);
  }

  @UseGuards(GenericPermissionGuard)
  @Patch(':entityName')
  @ApiGenericEntityOperation(
    'Aktualisiert einen Eintrag anhand seiner Primary Keys (als Query-Parameter)', // Updates an entry by its primary keys (as query parameters)
  )
  @ApiResponse({ status: 200, description: 'Eintrag erfolgreich aktualisiert' })
  @ApiQuery({
    name: 'primaryKeys',
    required: true,
    description:
      'Primary Key(s) als Query-Parameter, z.B. ?handle=1 oder ?key1=foo&key2=bar', // Primary key(s) as query parameter, e.g. ?handle=1 or ?key1=foo&key2=bar
    type: 'object',
    style: 'deepObject',
    explode: true,
  })

  // Describes the optional relations query parameter
  @ApiQuery({
    name: 'relations',
    required: false,
    description:
      'Eine Liste von Referenzen, die geladen werden sollen, z.B. "person, company, etc.".',
    type: String,
  })

  // Describes the request body for update data
  @ApiBody({
    description: 'JSON-Objekt mit den Feldern der neuen Entität.', // JSON object with the fields of the new entity
    required: true,
    schema: { type: 'object' },
  })
  async update(
    @Req() req: Request & { user: PersonItem },
    @Param('entityName') entityName: string,
    @Query() primaryKeysQuery: Record<string, any>,
    @Query() relationsQuery: UpdateQueryDto,
    @Body() updateData: object,
  ): Promise<any> {
    const primaryKeys = { ...primaryKeysQuery };
    delete primaryKeys.relations;
    return this.genericService.update(
      entityName,
      primaryKeys,
      updateData,
      req.user,
      relationsQuery.relations,
    );
  }

  @UseGuards(GenericPermissionGuard)
  @Delete(':entityName')
  @ApiGenericEntityOperation(
    'Löscht einen Eintrag anhand seiner Primary Keys (als Query-Parameter)', // Deletes an entry by its primary keys (as query parameters)
  )
  @ApiResponse({ status: 204, description: 'Eintrag erfolgreich gelöscht' })
  @ApiQuery({
    name: 'primaryKeys',
    required: true,
    description:
      'Primary Key(s) als Query-Parameter, z.B. ?handle=1 oder ?key1=foo&key2=bar', // Primary key(s) as query parameter, e.g. ?handle=1 or ?key1=foo&key2=bar
    type: 'object',
    style: 'deepObject',
    explode: true,
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Req() req: Request & { user: PersonItem },
    @Param('entityName') entityName: string,
    @Query() primaryKeysQuery: Record<string, any>,
  ): Promise<void> {
    const primaryKeys = { ...primaryKeysQuery };

    // Use all query parameters as PK (except page, limit, filter, etc.)
    await this.genericService.delete(entityName, primaryKeys, req.user);
  }
}
