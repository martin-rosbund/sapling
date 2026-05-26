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
import { GenericPermissionGuard } from '../../auth/guard/generic-permission.guard';
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
import { ChangeLogResponseDto } from './dto/change-log-response.dto';
import { TimelineResponseDto } from './dto/timeline-response.dto';
import {
  ApiGenericEntityOperation,
  ApiGenericEntityReferenceOperation,
  GenericPermission,
} from './generic.decorator';
import { PersonItem } from '../../entity/PersonItem';
import type { Request, Response } from 'express';
import { SessionOrBearerAuthGuard } from '../../auth/guard/session-or-token-auth.guard';
import { extractClientFormattingContextFromRequest } from '../common/client-formatting-context.util';
import { AdminPermissionGuard } from '../../auth/guard/admin-permission.guard';
import { AdminPermission } from '../../auth/admin-permission';

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
      'Returns a record-centric activity timeline grouped by month across the requested record and directly related entities.',
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
    description:
      'Timeline data grouped by month, including anchor state and summarized related activity.',
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
   * Retrieves the persisted change log for a single entity record.
   * @param {Request & { user: PersonItem }} req Express request object with authenticated user
   * @param {string} entityHandle Name of the entity
   * @param {string} handle Record handle of the entity
   * @returns {ChangeLogResponseDto[]} Change log entries ordered by newest first
   */
  @UseGuards(GenericPermissionGuard)
  @Get(':entityHandle/:handle/change-log')
  @GenericPermission('allowRead')
  @ApiOperation({
    summary: 'Get record change log',
    description:
      'Returns the persisted create, update, and delete log entries for a single record.',
  })
  @ApiGenericEntityOperation('Returns the persisted change log for one record')
  @ApiResponse({
    status: 200,
    description:
      'Persisted create, update, and delete log entries for the requested record.',
    type: ChangeLogResponseDto,
    isArray: true,
  })
  async getChangeLog(
    @Req() req: Request & { user: PersonItem },
    @Param('entityHandle') entityHandle: string,
    @Param('handle') handle: string,
  ): Promise<ChangeLogResponseDto[]> {
    return this.genericService.getRecordChangeLog(
      entityHandle,
      handle,
      req.user,
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
    description:
      'Returns a paginated result set for the requested entity, including optional filtering, sorting, and relation loading.',
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
    description: 'Number of results per page (default: 200, maximum: 200)',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description:
      'Paginated collection of entity records together with pagination metadata.',
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
    description:
      'Exports the filtered entity result set as a JSON file without pagination metadata or script execution.',
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
    description: 'JSON file download containing the matching entity records.',
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

  // #region Import
  @AdminPermission()
  @UseGuards(AdminPermissionGuard)
  @Post(':entityHandle/import')
  @ApiOperation({
    summary: 'Import entity data from parsed CSV rows',
    description:
      'Imports parsed tabular rows for the requested entity. Rows without handle create records; rows with handle update existing records. Entity permissions, scripts and change logging are applied per row.',
  })
  @ApiGenericEntityOperation('Imports parsed tabular rows for an entity')
  @ApiResponse({
    status: 200,
    description:
      'Import summary with one result entry per submitted row. Failed rows do not stop the whole import.',
    type: Object,
  })
  @ApiBody({
    description:
      'Payload containing rows parsed from a CSV/Excel-compatible table. Keys must match entity property names.',
    required: true,
    schema: {
      type: 'object',
      properties: {
        rows: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
      required: ['rows'],
    },
  })
  async importRows(
    @Req() req: Request & { user: PersonItem },
    @Param('entityHandle') entityHandle: string,
    @Body() body: { rows?: Record<string, unknown>[] },
  ): Promise<object> {
    return this.genericService.importRows(
      entityHandle,
      body.rows ?? [],
      req.user,
      extractClientFormattingContextFromRequest(req),
    );
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
    description:
      'Creates a new record for the requested entity. The accepted payload depends on the entity schema.',
  })
  @ApiGenericEntityOperation('Creates a new entry for an entity')
  @ApiResponse({
    status: 201,
    description: 'Created entity record.',
    type: Object,
  })
  @ApiBody({
    description: 'Entity-specific JSON payload for the new record.',
    required: true,
    schema: { type: 'object', additionalProperties: true },
  })
  async create(
    @Req() req: Request & { user: PersonItem },
    @Param('entityHandle') entityHandle: string,
    @Body() createData: object,
  ): Promise<any> {
    return this.genericService.create(
      entityHandle,
      createData,
      req.user,
      extractClientFormattingContextFromRequest(req),
    );
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
    description:
      'Updates an existing record identified by the handle query parameter. The accepted payload depends on the entity schema.',
  })
  @ApiGenericEntityOperation('Updates an entry by its handle')
  @ApiResponse({
    status: 200,
    description: 'Updated entity record.',
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
  @ApiQuery({
    name: 'expectedUpdatedAt',
    required: false,
    description:
      'Optimistic concurrency token from the record version that was loaded before editing. Usually the previous updatedAt value.',
    type: String,
  })
  @ApiQuery({
    name: 'merge',
    required: false,
    description:
      'When true, non-overlapping stale updates are merged automatically. Overlapping field changes still return 409 with merge details.',
    type: Boolean,
  })
  @ApiBody({
    description:
      'Entity-specific JSON payload containing the fields to update.',
    required: true,
    schema: { type: 'object', additionalProperties: true },
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
      extractClientFormattingContextFromRequest(req),
      {
        expectedUpdatedAt: relationsQuery.expectedUpdatedAt,
        merge: relationsQuery.merge,
      },
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
    description:
      'Deletes an existing record identified by the handle query parameter.',
  })
  @ApiGenericEntityOperation('Deletes an entry by its handle')
  @ApiResponse({
    status: 204,
    description: 'Record deleted successfully. No response body is returned.',
  })
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
    await this.genericService.delete(
      entityHandle,
      handle,
      req.user,
      extractClientFormattingContextFromRequest(req),
    );
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
    summary: 'Create an n:m relation entry',
    description:
      'Adds a relation between the current entity record and another record through the specified many-to-many reference.',
  })
  @ApiGenericEntityReferenceOperation('Creates a reference for an entity')
  @ApiBody({
    description:
      'Payload identifying the owning record and the related record to link.',
    required: true,
    schema: {
      type: 'object',
      properties: {
        entityHandle: {
          type: 'string',
          description: 'Handle of the primary record that owns the relation.',
        },
        referenceHandle: {
          type: 'string',
          description: 'Handle of the related record that should be linked.',
        },
      },
      required: ['entityHandle', 'referenceHandle'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Relation created successfully.',
    type: Object,
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
      extractClientFormattingContextFromRequest(req),
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
    summary: 'Delete an n:m relation entry',
    description:
      'Removes a relation between the current entity record and another record through the specified many-to-many reference.',
  })
  @ApiGenericEntityReferenceOperation('Deletes a reference for an entity')
  @ApiBody({
    description:
      'Payload identifying the owning record and the related record to unlink.',
    required: true,
    schema: {
      type: 'object',
      properties: {
        entityHandle: {
          type: 'string',
          description: 'Handle of the primary record that owns the relation.',
        },
        referenceHandle: {
          type: 'string',
          description: 'Handle of the related record that should be removed.',
        },
      },
      required: ['entityHandle', 'referenceHandle'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Relation removed successfully.',
    type: Object,
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
      extractClientFormattingContextFromRequest(req),
    );
  }
  // #endregion
}
