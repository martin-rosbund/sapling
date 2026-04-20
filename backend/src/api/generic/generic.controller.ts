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
  Res,
  UseGuards,
} from '@nestjs/common';
import { GenericPermissionGuard } from './generic-permission.guard';
import { GenericService } from './generic.service';
import {
  PaginatedQueryDto,
  TimelineQueryDto,
  UpdateQueryDto,
} from './dto/query.dto';
import {
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
  ApiBody,
  ApiTags,
  ApiOperation,
} from '@nestjs/swagger';
import { PaginatedResponseDto } from './dto/paginated-response.dto';
import { TimelineResponseDto } from './dto/timeline-response.dto';
import {
  ApiGenericEntityOperation,
  ApiGenericEntityReferenceOperation,
  GenericPermission,
} from './generic.decorator';
import { PersonItem } from '../../entity/PersonItem';
import type { Response } from 'express';
import { SessionOrBearerAuthGuard } from '../../auth/session-or-token-auth.guard';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Controller for generic CRUD operations on entities. Handles routing, request validation, and delegates business logic to GenericService.
 *
 * @property        {GenericService} genericService  Injected service for entity operations
 *
 * @method          findPaginated     Retrieves a paginated list of entities
 * @method          download         Downloads entity data as JSON
 * @method          create           Creates a new entry for an entity
 * @method          update           Updates an entry by its handle
 * @method          delete           Deletes an entry by its handle
 * @method          createReference  Adds references to an n:m relation
 * @method          deleteReference  Removes references from an n:m relation
 */
@ApiTags('Generic')
@ApiBearerAuth()
@Controller('api/generic')
@UseGuards(SessionOrBearerAuthGuard)
export class GenericController {
  // #region Constructor
  /**
   * Injects the GenericService for entity operations.
   * @param {GenericService} genericService Service for generic entity logic
   */
  constructor(private readonly genericService: GenericService) {}
  // #endregion

  // #region Find
  /**
   * Retrieves a record-centric timeline for an entity entry.
   * @param {Request & { user: PersonItem }} req Express request object with authenticated user
   * @param {string} entityHandle Name of the main entity
   * @param {string} handle Record handle of the main entity
   * @param {TimelineQueryDto} query Timeline cursor query
   * @returns {TimelineResponseDto} Timeline response with anchor and month summaries
   */
  @UseGuards(GenericPermissionGuard)
  @Get(':entityHandle/:handle/timeline')
  @GenericPermission('allowRead')
  @ApiOperation({
    summary: 'Get record timeline',
    description:
      'Retrieves a record-centric timeline with month-based summaries across directly related entities.',
  })
  @ApiGenericEntityOperation(
    'Returns a record-centric timeline for an entity entry',
  )
  @ApiQuery({
    name: 'before',
    required: false,
    description:
      'Month cursor in YYYY-MM format used to load older timeline months.',
    type: String,
  })
  @ApiQuery({
    name: 'months',
    required: false,
    description: 'Number of non-empty months to load per request (default: 6).',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Successful request',
    type: TimelineResponseDto,
  })
  async getTimeline(
    @Req() req: Request & { user: PersonItem },
    @Param('entityHandle') entityHandle: string,
    @Param('handle') handle: string,
    @Query() query: TimelineQueryDto,
  ): Promise<TimelineResponseDto> {
    return this.genericService.getRecordTimeline(
      entityHandle,
      handle,
      req.user,
      query.before,
      query.months,
    );
  }

  /**
   * Retrieves a paginated list of entities.
   * @param {Request & { user: PersonItem }} req Express request object with authenticated user
   * @param {string} entityHandle Name of the entity
   * @param {PaginatedQueryDto} query Paginated query parameters (filter, orderBy, relations, page, limit)
   * @returns {PaginatedResponseDto} Paginated list of entities
   */
  @UseGuards(GenericPermissionGuard)
  @Get(':entityHandle')
  @ApiOperation({
    summary: 'Get paginated entity list',
    description: 'Retrieves a paginated list for an entity.',
  })
  @ApiGenericEntityOperation('Returns a paginated list for an entity')
  @ApiQuery({
    name: 'filter',
    required: false,
    description:
      'A JSON string for complex WHERE conditions (e.g. {"name":{"$ilike":"%test%"}})',
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
      'A JSON list of references to load, e.g. ["person", "company"]',
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
    description: 'Number of results per page (default: 1000)',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Successful request',
    type: PaginatedResponseDto,
  })
  async findPaginated(
    @Req() req: Request & { user: PersonItem },
    @Param('entityHandle') entityHandle: string,
    @Query() query: PaginatedQueryDto,
  ): Promise<PaginatedResponseDto> {
    const { page, limit, filter, orderBy, relations } = query;
    return this.genericService.findAndCount(
      entityHandle,
      filter,
      page,
      limit,
      orderBy,
      req.user,
      relations,
    );
  }
  // #endregion

  // #region Download
  /**
   * Downloads entity data as JSON (no scripting, no count).
   * @param {Request & { user: PersonItem }} req Express request object with authenticated user
   * @param {Response} res Express response object
   * @param {string} entityHandle Name of the entity
   * @param {PaginatedQueryDto} query Query parameters (filter, orderBy, relations)
   * @returns {void} Sends JSON file as response
   */
  @UseGuards(GenericPermissionGuard)
  @Get(':entityHandle/download')
  @ApiOperation({
    summary: 'Download entity data as JSON',
    description: 'Downloads entity data as JSON file (no scripting, no count).',
  })
  @ApiGenericEntityOperation('Downloads entity data as JSON')
  @ApiQuery({
    name: 'filter',
    required: false,
    description:
      'A JSON string for complex WHERE conditions (e.g. {"name":{"$ilike":"%test%"}})',
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
  @ApiResponse({
    status: 200,
    description: 'JSON download',
    type: String,
  })
  async download(
    @Req() req: Request & { user: PersonItem },
    @Res() res: Response,
    @Param('entityHandle') entityHandle: string,
    @Query() query: PaginatedQueryDto,
  ): Promise<void> {
    const { filter, orderBy, relations } = query;
    const json = await this.genericService.downloadJSON(
      entityHandle,
      filter,
      orderBy,
      req.user,
      relations,
    );
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${entityHandle}.json"`,
    );
    res.send(json);
  }
  // #endregion

  // #region Create
  /**
   * Creates a new entry for an entity.
   * @param {Request & { user: PersonItem }} req Express request object with authenticated user
   * @param {string} entityHandle Name of the entity
   * @param {object} createData JSON object with the fields of the new entity
   * @returns {any} The created entity
   */
  @UseGuards(GenericPermissionGuard)
  @Post(':entityHandle')
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
    @Param('entityHandle') entityHandle: string,
    @Body() createData: object,
  ): Promise<any> {
    return this.genericService.create(entityHandle, createData, req.user);
  }
  // #endregion

  // #region Update
  /**
   * Updates an entry by its handle.
   * @param {Request & { user: PersonItem }} req Express request object with authenticated user
   * @param {string} entityHandle Name of the entity
   * @param {string} handle Entity handle as query parameter
   * @param {UpdateQueryDto} relationsQuery Optional relations to load
   * @param {object} updateData JSON object with the fields to update
   * @returns {any} The updated entity
   */
  @UseGuards(GenericPermissionGuard)
  @Patch(':entityHandle')
  @ApiOperation({
    summary: 'Update entity entry',
    description: 'Updates an entry by its handle.',
  })
  @ApiGenericEntityOperation('Updates an entry by its handle')
  @ApiResponse({
    status: 200,
    description: 'Entry updated successfully',
    type: Object,
  })
  @ApiQuery({
    name: 'handle',
    required: true,
    description: 'Handle of the entity to update, e.g. ?handle=1',
    type: String,
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
    @Param('entityHandle') entityHandle: string,
    @Query('handle') handle: string,
    @Query() relationsQuery: UpdateQueryDto,
    @Body() updateData: object,
  ): Promise<any> {
    return this.genericService.update(
      entityHandle,
      handle,
      updateData,
      req.user,
      relationsQuery.relations,
    );
  }
  // #endregion

  // #region Delete
  /**
   * Deletes an entry by its handle.
   * @param {Request & { user: PersonItem }} req Express request object with authenticated user
   * @param {string} entityHandle Name of the entity
   * @param {string} handle Entity handle as query parameter
   * @returns {void} No return value
   */
  @UseGuards(GenericPermissionGuard)
  @Delete(':entityHandle')
  @ApiOperation({
    summary: 'Delete entity entry',
    description: 'Deletes an entry by its handle.',
  })
  @ApiGenericEntityOperation('Deletes an entry by its handle')
  @ApiResponse({ status: 204, description: 'Entry deleted successfully' })
  @ApiQuery({
    name: 'handle',
    required: true,
    description: 'Handle of the entity to delete, e.g. ?handle=1',
    type: String,
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Req() req: Request & { user: PersonItem },
    @Param('entityHandle') entityHandle: string,
    @Query('handle') handle: string,
  ): Promise<void> {
    await this.genericService.delete(entityHandle, handle, req.user);
  }
  // #endregion

  // #region Create Reference
  /**
   * Adds references to an n:m relation for an entity.
   * @param {Request & { user: PersonItem }} req Express request object with authenticated user
   * @param {string} entityHandle Name of the entity
   * @param {string} referenceName Name of the reference relation
   * @param {object} body Object containing entityHandle and referenceHandle
   * @returns {any} Result of reference creation
   */
  @UseGuards(GenericPermissionGuard)
  @Post(':entityHandle/:referenceName/create')
  @GenericPermission('allowUpdate')
  @ApiOperation({
    summary: 'Insert n:m reference',
    description: 'Fügt Referenzen zu einer n:m-Relation hinzu.',
  })
  @ApiGenericEntityReferenceOperation('Creates a reference for an entity')
  @ApiBody({
    description: 'Body: { entityHandle, referenceHandle }',
    required: true,
    schema: { type: 'object' },
  })
  async createReference(
    @Req() req: Request & { user: PersonItem },
    @Param('entityHandle') entityHandle: string,
    @Param('referenceName') referenceName: string,
    @Body()
    body: {
      entityHandle: string | number;
      referenceHandle: string | number;
    },
  ): Promise<any> {
    return this.genericService.createReference(
      entityHandle,
      referenceName,
      body.entityHandle,
      body.referenceHandle,
      req.user,
    );
  }
  // #endregion

  // #region Delete Reference
  /**
   * Removes references from an n:m relation for an entity.
   * @param {Request & { user: PersonItem }} req Express request object with authenticated user
   * @param {string} entityHandle Name of the entity
   * @param {string} referenceName Name of the reference relation
   * @param {object} body Object containing entityHandle and referenceHandle
   * @returns {any} Result of reference deletion
   */
  @UseGuards(GenericPermissionGuard)
  @Post(':entityHandle/:referenceName/delete')
  @GenericPermission('allowUpdate')
  @ApiOperation({
    summary: 'Delete n:m reference',
    description: 'Entfernt Referenzen aus einer n:m-Relation.',
  })
  @ApiGenericEntityReferenceOperation('Deletes a reference for an entity')
  @ApiBody({
    description: 'Body: { entityHandle, referenceHandle }',
    required: true,
    schema: { type: 'object' },
  })
  async deleteReference(
    @Req() req: Request & { user: PersonItem },
    @Param('entityHandle') entityHandle: string,
    @Param('referenceName') referenceName: string,
    @Body()
    body: {
      entityHandle: string | number;
      referenceHandle: string | number;
    },
  ): Promise<any> {
    return this.genericService.deleteReference(
      entityHandle,
      referenceName,
      body.entityHandle,
      body.referenceHandle,
      req.user,
    );
  }
  // #endregion
}
