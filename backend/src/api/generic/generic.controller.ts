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
import { PaginatedQueryDto, UpdateQueryDto } from './dto/query.dto';
import {
  ApiResponse,
  ApiQuery,
  ApiBody,
  ApiTags,
  ApiOperation,
} from '@nestjs/swagger';
import { PaginatedResponseDto } from './dto/paginated-response.dto';
import {
  ApiGenericEntityOperation,
  ApiGenericEntityReferenceOperation,
} from './generic.decorator';
import { PersonItem } from '../../entity/PersonItem';

/**
 * Controller for generic CRUD operations on entities.
 */
@ApiTags('Generic')
@Controller('generic')
export class GenericController {
  // #region Constructor
  /**
   * Injects the GenericService for entity operations.
   * @param genericService Service for generic entity logic
   */
  constructor(private readonly genericService: GenericService) {}
  // #endregion

  // #region Find
  /**
   * Get a paginated list of entities.
   * @param req Express request object with authenticated user
   * @param entityName Name of the entity
   * @param query Paginated query parameters (filter, orderBy, relations, page, limit)
   * @returns Paginated list of entities
   */
  @UseGuards(GenericPermissionGuard)
  @Get(':entityName')
  @ApiOperation({
    summary: 'Get paginated entity list',
    description: 'Retrieves a paginated list for an entity.',
  })
  @ApiGenericEntityOperation('Returns a paginated list for an entity')
  @ApiQuery({
    name: 'filter',
    required: false,
    description:
      'A JSON string for complex WHERE conditions (e.g. {"name":{"$like":"%Test%"}})',
    type: String,
  })
  @ApiQuery({
    name: 'orderBy',
    required: false,
    description:
      'A JSON string for sorting, e.g. {"name":"ASC","createdAt":"DESC"}',
    type: String,
  })
  @ApiQuery({
    name: 'relations',
    required: false,
    description:
      'A comma-separated list of references to load, e.g. "person, company, etc."',
    type: String,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number of results (default: 1)',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of results per page (default: 10)',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Successful request',
    type: PaginatedResponseDto,
  })
  async findPaginated(
    @Req() req: Request & { user: PersonItem },
    @Param('entityName') entityName: string,
    @Query() query: PaginatedQueryDto,
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
  // #endregion

  // #region Create
  /**
   * Create a new entry for an entity.
   * @param req Express request object with authenticated user
   * @param entityName Name of the entity
   * @param createData JSON object with the fields of the new entity
   * @returns The created entity
   */
  @UseGuards(GenericPermissionGuard)
  @Post(':entityName')
  @ApiOperation({
    summary: 'Create entity entry',
    description: 'Creates a new entry for an entity.',
  })
  @ApiGenericEntityOperation('Creates a new entry for an entity')
  @ApiResponse({
    status: 201,
    description: 'Entry created successfully',
    type: Object,
  })
  @ApiBody({
    description: 'JSON object with the fields of the new entity.',
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
  // #endregion

  // #region Update
  /**
   * Update an entry by its primary keys (as query parameters).
   * @param req Express request object with authenticated user
   * @param entityName Name of the entity
   * @param primaryKeysQuery Primary key(s) as query parameter
   * @param relationsQuery Optional relations to load
   * @param updateData JSON object with the fields to update
   * @returns The updated entity
   */
  @UseGuards(GenericPermissionGuard)
  @Patch(':entityName')
  @ApiOperation({
    summary: 'Update entity entry',
    description: 'Updates an entry by its primary keys (as query parameters).',
  })
  @ApiGenericEntityOperation(
    'Updates an entry by its primary keys (as query parameters)',
  )
  @ApiResponse({
    status: 200,
    description: 'Entry updated successfully',
    type: Object,
  })
  @ApiQuery({
    name: 'primaryKeys',
    required: true,
    description:
      'Primary key(s) as query parameter, e.g. ?handle=1 or ?key1=foo&key2=bar',
    type: 'object',
    style: 'deepObject',
    explode: true,
  })
  @ApiQuery({
    name: 'relations',
    required: false,
    description:
      'A comma-separated list of references to load, e.g. "person, company, etc."',
    type: String,
  })
  @ApiBody({
    description: 'JSON object with the fields to update.',
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
  // #endregion

  // #region Delete
  /**
   * Delete an entry by its primary keys (as query parameters).
   * @param req Express request object with authenticated user
   * @param entityName Name of the entity
   * @param primaryKeysQuery Primary key(s) as query parameter
   * @returns void
   */
  @UseGuards(GenericPermissionGuard)
  @Delete(':entityName')
  @ApiOperation({
    summary: 'Delete entity entry',
    description: 'Deletes an entry by its primary keys (as query parameters).',
  })
  @ApiGenericEntityOperation(
    'Deletes an entry by its primary keys (as query parameters)',
  )
  @ApiResponse({ status: 204, description: 'Entry deleted successfully' })
  @ApiQuery({
    name: 'primaryKeys',
    required: true,
    description:
      'Primary key(s) as query parameter, e.g. ?handle=1 or ?key1=foo&key2=bar',
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
    await this.genericService.delete(entityName, primaryKeys, req.user);
  }
  // #endregion

  // #region Create Reference
  /**
   * Fügt Referenzen zu einer n:m-Relation hinzu.
   */
  @UseGuards(GenericPermissionGuard)
  @Post(':entityName/:referenceName/create')
  @ApiOperation({
    summary: 'Insert n:m reference',
    description: 'Fügt Referenzen zu einer n:m-Relation hinzu.',
  })
  @ApiGenericEntityReferenceOperation('Creates a reference for an entity')
  @ApiBody({
    description: 'Body: { primaryKeys, relationName, referencesToAdd }',
    required: true,
    schema: { type: 'object' },
  })
  async createReference(
    @Req() req: Request & { user: PersonItem },
    @Param('entityName') entityName: string,
    @Param('referenceName') referenceName: string,
    @Body()
    body: {
      entityPrimaryKeys: Record<string, any>;
      referencePrimaryKeys: Record<string, any>;
    },
  ): Promise<any> {
    return this.genericService.createReference(
      entityName,
      referenceName,
      body.entityPrimaryKeys,
      body.referencePrimaryKeys,
      req.user,
    );
  }
  // #endregion

  // #region Delete Reference
  /**
   * Entfernt Referenzen aus einer n:m-Relation.
   */
  @UseGuards(GenericPermissionGuard)
  @Post(':entityName/:referenceName/delete')
  @ApiOperation({
    summary: 'Delete n:m reference',
    description: 'Entfernt Referenzen aus einer n:m-Relation.',
  })
  @ApiGenericEntityReferenceOperation('Deletes a reference for an entity')
  @ApiBody({
    description: 'Body: { primaryKeys, relationName, referencesToRemove }',
    required: true,
    schema: { type: 'object' },
  })
  async deleteReference(
    @Req() req: Request & { user: PersonItem },
    @Param('entityName') entityName: string,
    @Param('referenceName') referenceName: string,
    @Body()
    body: {
      entityPrimaryKeys: Record<string, any>;
      referencePrimaryKeys: Record<string, any>;
    },
  ): Promise<any> {
    return this.genericService.deleteReference(
      entityName,
      referenceName,
      body.entityPrimaryKeys,
      body.referencePrimaryKeys,
      req.user,
    );
  }
  // #endregion
}
