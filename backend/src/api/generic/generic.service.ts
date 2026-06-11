import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { TemplateService } from '../template/template.service';
import { EntityItem } from '../../entity/EntityItem';
import { PersonItem } from '../../entity/PersonItem';
import { ChangeLogItem } from '../../entity/ChangeLogItem';
import { ChangeLogDetailItem } from '../../entity/ChangeLogDetailItem';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';
import { performance } from 'perf_hooks';
import { ScriptMethods } from '../script/script.service';
import type { ScriptServerContext } from '../../script/core/script.interface';
import { ChangeLogResponseDto } from './dto/change-log-response.dto';
import { TimelineResponseDto } from './dto/timeline-response.dto';
import { GenericMutationService } from './generic-mutation.service';
import { GenericPayloadService } from './generic-payload.service';
import { GenericPermissionService } from './generic-permission.service';
import { GenericQueryService } from './generic-query.service';
import { GenericReadService } from './generic-read.service';
import { GenericRelationService } from './generic-relation.service';
import { GenericReferenceService } from './generic-reference.service';
import { GenericSanitizerService } from './generic-sanitizer.service';
import { GenericCustomFieldService } from './generic-custom-field.service';
import { ChangeLogActionItem } from '../../entity/ChangeLogActionItem';
import { EventItem } from '../../entity/EventItem';
import { OpenTaskEventsService } from '../current/open-task-events.service';
import { EffortEstimateItem } from '../../entity/EffortEstimateItem';
import { SalesOpportunityItem } from '../../entity/SalesOpportunityItem';
import { TicketItem } from '../../entity/TicketItem';
import {
  GenericTimelineService,
  TimelineDescriptorDataset,
  TimelineRecordResult,
  TimelineRelationDescriptor,
} from './generic-timeline.service';
import { GENERIC_DOWNLOAD_LIMIT } from '../../constants/project.constants';
import {
  extractImportHandle,
  getImportErrorMessage,
  hasImportableRowValues,
  normalizeBoolean,
  normalizeImportRow,
} from './generic-import.util';
import {
  areUpdateConflictValuesEqual,
  asChangeLogRecord,
  buildChangeLogDetails,
  extractChangeLogReference,
  mergeChangeLogPayloadShape,
  normalizeChangeLogPayload,
  normalizeChangeLogValue,
  normalizeConcurrencyBasePayload,
  normalizeConcurrencyTimestamp,
  normalizeUpdateConflictValue,
  projectChangeLogPayload,
  type ChangeLogAction,
  type ChangeLogPayload,
} from './generic-change-log.util';
import type {
  GenericImportResponse,
  GenericImportRowResult,
} from './generic-import.util';
export type { GenericImportResponse } from './generic-import.util';

type GenericUpdateConcurrencyResolution = 'detect' | 'merge' | 'overwrite';
export type GenericUpdateConcurrencyOptions = {
  expectedUpdatedAt?: string | Date | null;
  basePayload?: Record<string, unknown> | null;
  resolution?: GenericUpdateConcurrencyResolution;
  merge?: boolean;
};
type NormalizedUpdateConcurrencyMetadata = {
  expectedUpdatedAt?: string | null;
  basePayload?: ChangeLogPayload;
  resolution?: GenericUpdateConcurrencyResolution;
};
type UpdateConflictField = {
  property: string;
  baseValue: unknown;
  currentValue: unknown;
  attemptedValue: unknown;
  changedInCurrent: boolean;
  changedInAttempt: boolean;
  conflict: boolean;
};
type UpdateConflictEvaluation = {
  stale: boolean;
  expectedUpdatedAt: string | null;
  currentUpdatedAt: string | null;
  basePayload: ChangeLogPayload;
  currentPayload: ChangeLogPayload;
  attemptedPayload: ChangeLogPayload;
  fields: UpdateConflictField[];
  conflictingProperties: string[];
  mergeableProperties: string[];
};
type RelationMutationContext = Awaited<
  ReturnType<GenericRelationService['addReferenceAndFlush']>
>;
const GENERIC_CONCURRENCY_METADATA_KEY = '_saplingConcurrency';
const UPDATE_CONFLICT_IGNORED_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  GENERIC_CONCURRENCY_METADATA_KEY,
]);
const OPEN_TASK_ENTITY_HANDLES = new Set([
  'ticket',
  'event',
  'salesOpportunity',
  'effortEstimate',
]);

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Service for generic CRUD operations on entities. Handles business logic, security, and scripting for entity manipulation.
 *
 * @property        {EntityManager} em              MikroORM entity manager for database operations
 * @property        {TemplateService} templateService Service for entity templates
 * @property        {GenericQueryService} genericQueryService Service for query normalization and relation population
 * @property        {GenericReadService} genericReadService Service for read-filter, read scripts, and query execution workflows
 * @property        {GenericMutationService} genericMutationService Service for script-driven mutation and persistence workflows
 * @property        {GenericPayloadService} genericPayloadService Service for template-based payload preparation
 * @property        {GenericRelationService} genericRelationService Service for relation add/remove workflows
 * @property        {GenericPermissionService} genericPermissionService Service for permission checks and security filters
 * @property        {GenericReferenceService} genericReferenceService Service for relation handling and reference dependency validation
 * @property        {GenericSanitizerService} genericSanitizerService Service for sanitizing entity graphs and security fields
 * @property        {GenericTimelineService} genericTimelineService Service for timeline descriptors, windows, and summary composition
 *
 * @method          findAndCount     Retrieves a paginated list of entities
 * @method          downloadJSON     Downloads entity data as JSON
 * @method          create           Creates a new entry for an entity
 * @method          update           Updates an entry by its handle
 * @method          delete           Deletes an entry by its handle
 * @method          createReference  Adds references to an n:m relation
 * @method          deleteReference  Removes references from an n:m relation
 * @method          checkTopLevelPermission Checks if data manipulation is allowed
 * @method          setTopLevelFilter Applies top-level security filters
 * @method          buildPopulate    Builds the populate list for relations
 * @method          reduceReferenceFields Reduces reference fields in data
 */
@Injectable()
export class GenericService {
  // #region Constructor
  /**
   * Service constructor with dependency injection.
   * @param {EntityManager} em MikroORM entity manager
   * @param {TemplateService} templateService Service for entity templates
   * @param {GenericQueryService} genericQueryService Service for query normalization and relation population
   * @param {GenericReadService} genericReadService Service for read-filter, read scripts, and query execution workflows
   * @param {GenericMutationService} genericMutationService Service for script-driven mutation and persistence workflows
   * @param {GenericPayloadService} genericPayloadService Service for template-based payload preparation
   * @param {GenericRelationService} genericRelationService Service for relation add/remove workflows
   * @param {GenericPermissionService} genericPermissionService Service for permission checks and security filters
   * @param {GenericReferenceService} genericReferenceService Service for relation handling and reference dependency validation
   * @param {GenericSanitizerService} genericSanitizerService Service for sanitizing entity graphs and security fields
   * @param {GenericTimelineService} genericTimelineService Service for timeline descriptors, windows, and summary composition
   */
  constructor(
    private readonly em: EntityManager,
    private readonly templateService: TemplateService,
    private readonly genericQueryService: GenericQueryService,
    private readonly genericReadService: GenericReadService,
    private readonly genericMutationService: GenericMutationService,
    private readonly genericPayloadService: GenericPayloadService,
    private readonly genericRelationService: GenericRelationService,
    private readonly genericPermissionService: GenericPermissionService,
    private readonly genericReferenceService: GenericReferenceService,
    private readonly genericSanitizerService: GenericSanitizerService,
    private readonly genericTimelineService: GenericTimelineService,
    private readonly openTaskEventsService: OpenTaskEventsService,
    private readonly genericCustomFieldService: GenericCustomFieldService = {
      applyCustomFieldFilters: async (_entityHandle: string, criteria: object) =>
        criteria,
      hydrateRecords: async <T>(_entityHandle: string, input: T) => input,
      splitPayload: <T extends Record<string, unknown>>(payload: T) => ({
        data: payload,
        customFields: {},
      }),
      assertRequiredFields: async () => undefined,
      upsertCustomFieldValues: async () => undefined,
    } as unknown as GenericCustomFieldService,
  ) {}
  // #endregion

  // #region Find / Count
  /**
   * Retrieves a paginated list of entities, applies security, and runs before/after scripts.
   * @param {string} entityHandle Name of the entity
   * @param {object} where Filter conditions
   * @param {number} page Page number
   * @param {number} limit Number of results per page
   * @param {object} orderBy Sorting conditions
   * @param {PersonItem} currentUser Current user object
   * @param {string[]} relations Relations to populate
   * @returns {Promise<{ data: object[]; meta: object }>} Paginated entity data and metadata
   */
  async findAndCount(
    entityHandle: string,
    where: object = {},
    page: number,
    limit: number,
    orderBy: object = {},
    currentUser: PersonItem,
    relations: string[] = [],
  ): Promise<{
    data: object[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      executionTime: number;
    };
  }> {
    const startTime = performance.now();
    const entityClass = this.genericQueryService.getEntityClass(entityHandle);
    const offset = (page - 1) * limit;
    const template = this.templateService.getEntityTemplate(entityHandle);
    where = await this.genericCustomFieldService.applyCustomFieldFilters(
      entityHandle,
      where,
    );
    where = this.genericQueryService.normalizeQueryCriteria(
      entityHandle,
      where,
      'filter',
    );
    orderBy = this.removeCustomFieldOrderBy(orderBy);
    orderBy = this.genericQueryService.normalizeQueryCriteria(
      entityHandle,
      orderBy,
      'orderBy',
    );
    const populate = this.genericQueryService.buildPopulate(
      [
        ...relations,
        ...this.genericQueryService.collectQueryPopulateRelations(
          entityHandle,
          where,
        ),
        ...this.genericQueryService.collectQueryPopulateRelations(
          entityHandle,
          orderBy,
        ),
      ],
      template,
    );
    const result = await this.genericReadService.findAndCount(
      entityHandle,
      entityClass,
      where,
      currentUser,
      template,
      {
        limit,
        offset,
        orderBy,
        populate: populate as any[],
      },
    );

    let items = result.items;
    const total = result.total;

    if (page == null) {
      limit = total;
      page = 1;
    }

    items = await this.genericReadService.applyAfterRead(
      items,
      result.entity,
      currentUser,
    );

    items = this.genericSanitizerService.sanitizeEntityResult(
      entityHandle,
      items,
      template,
    );
    items = await this.genericCustomFieldService.hydrateRecords(
      entityHandle,
      items,
    );

    const executionTime = (performance.now() - startTime) / 1000;
    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        executionTime: executionTime,
      },
    };
  }
  // #endregion

  // #region Download
  /**
   * Downloads entity data as JSON (no scripting, no count).
   * Extensible for other formats.
   * @param {string} entityHandle Name of the entity
   * @param {object} where Filter conditions
   * @param {object} orderBy Sorting conditions
   * @param {PersonItem} currentUser Current user object
   * @param {string[]} relations Relations to populate
   * @returns {Promise<string>} JSON string of entity data
   */
  async downloadJSON(
    entityHandle: string,
    where: object = {},
    orderBy: object = {},
    currentUser: PersonItem,
    relations: string[] = [],
  ): Promise<string> {
    const entityClass = this.genericQueryService.getEntityClass(entityHandle);
    const template = this.templateService.getEntityTemplate(entityHandle);
    where = await this.genericCustomFieldService.applyCustomFieldFilters(
      entityHandle,
      where,
    );
    where = this.genericQueryService.normalizeQueryCriteria(
      entityHandle,
      where,
      'filter',
    );
    orderBy = this.removeCustomFieldOrderBy(orderBy);
    orderBy = this.genericQueryService.normalizeQueryCriteria(
      entityHandle,
      orderBy,
      'orderBy',
    );
    const populate = this.genericQueryService.buildPopulate(
      [
        ...relations,
        ...this.genericQueryService.collectQueryPopulateRelations(
          entityHandle,
          where,
        ),
        ...this.genericQueryService.collectQueryPopulateRelations(
          entityHandle,
          orderBy,
        ),
      ],
      template,
    );
    const result = await this.genericReadService.find(
      entityHandle,
      entityClass,
      where,
      currentUser,
      template,
      {
        limit: GENERIC_DOWNLOAD_LIMIT + 1,
        orderBy,
        populate: populate as any[],
        runBeforeReadScript: entityHandle === 'dashboardTemplate',
      },
    );

    if (result.items.length > GENERIC_DOWNLOAD_LIMIT) {
      throw new BadRequestException('exception.exportLimitExceeded');
    }

    // Convert to JSON
    const sanitized = this.genericSanitizerService.sanitizeEntityResult(
      entityHandle,
      result.items,
      template,
    );
    const hydrated = await this.genericCustomFieldService.hydrateRecords(
      entityHandle,
      sanitized,
    );
    return JSON.stringify(hydrated, null, 2);
  }
  // #endregion

  // #region Import
  async importRows(
    entityHandle: string,
    rows: Record<string, unknown>[],
    currentUser: PersonItem,
    scriptContext: ScriptServerContext = {},
  ): Promise<GenericImportResponse> {
    if (!Array.isArray(rows)) {
      throw new BadRequestException('global.invalidPayload');
    }

    const template = this.templateService.getEntityTemplate(entityHandle);
    const results: GenericImportRowResult[] = [];

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2;

      if (!hasImportableRowValues(row)) {
        results.push({ rowNumber, action: 'skipped' });
        continue;
      }

      const payload = normalizeImportRow(template, row);
      const handle = extractImportHandle(payload);

      try {
        if (handle == null) {
          const created = await this.create(
            entityHandle,
            payload,
            currentUser,
            scriptContext,
          );
          results.push({
            rowNumber,
            action: 'created',
            handle: this.extractEntityHandle(created),
          });
        } else {
          const updated = await this.update(
            entityHandle,
            handle,
            payload,
            currentUser,
            [],
            scriptContext,
            { resolution: 'overwrite' },
          );
          results.push({
            rowNumber,
            action: 'updated',
            handle: this.extractEntityHandle(updated) ?? handle,
          });
        }
      } catch (error) {
        results.push({
          rowNumber,
          action: 'failed',
          handle,
          message: getImportErrorMessage(error),
        });
      }
    }

    return {
      totalRows: rows.length,
      created: results.filter((result) => result.action === 'created').length,
      updated: results.filter((result) => result.action === 'updated').length,
      skipped: results.filter((result) => result.action === 'skipped').length,
      failed: results.filter((result) => result.action === 'failed').length,
      rows: results,
    };
  }
  // #endregion

  // #region Timeline
  async getRecordTimeline(
    entityHandle: string,
    handle: string | number,
    currentUser: PersonItem,
    before?: string,
    months = 6,
  ): Promise<TimelineResponseDto> {
    const normalizedHandle = this.genericReferenceService.normalizeHandleValue(
      entityHandle,
      handle,
    );
    const normalizedMonths = Number.isFinite(months)
      ? Math.max(1, Math.min(12, Number(months)))
      : 6;
    const mainTemplate = this.templateService.getEntityTemplate(entityHandle);
    const mainDateFields =
      this.genericTimelineService.getTimelineDateFieldConfig(mainTemplate);
    const mainRecord = await this.findTimelineRecord(
      entityHandle,
      this.genericReferenceService.getHandleFilter(
        entityHandle,
        normalizedHandle,
      ),
      mainTemplate,
      currentUser,
    );

    if (!mainRecord) {
      throw new NotFoundException('global.notFound');
    }

    const anchor = this.genericTimelineService.buildTimelineAnchor(
      entityHandle,
      normalizedHandle,
      mainRecord,
      mainTemplate,
      mainDateFields,
    );
    const cursorMonth =
      this.genericTimelineService.parseTimelineCursor(before) ??
      this.genericTimelineService.addMonths(new Date(), 1);
    const relationDescriptors =
      this.genericTimelineService.getTimelineRelationDescriptors(
        entityHandle,
        currentUser,
      );
    const datasets = await this.loadTimelineDescriptorDatasets(
      relationDescriptors,
      normalizedHandle,
      currentUser,
      cursorMonth,
    );
    const lowerBound =
      this.genericTimelineService.getTimelineLowerBound(datasets);

    const response = new TimelineResponseDto();
    response.entityHandle = entityHandle;
    response.handle = normalizedHandle;
    response.anchor = anchor;

    if (!lowerBound) {
      response.hasMore = false;
      response.nextBefore = null;
      return response;
    }

    let currentMonth = this.genericTimelineService.getMonthStart(cursorMonth);

    while (
      response.months.length < normalizedMonths &&
      currentMonth.getTime() >= lowerBound.getTime()
    ) {
      const monthWindow =
        this.genericTimelineService.createTimelineMonthWindow(currentMonth);
      const month = this.genericTimelineService.buildTimelineMonth(
        datasets,
        monthWindow,
      );
      response.months.push(month);

      currentMonth = this.genericTimelineService.addMonths(currentMonth, -1);
    }

    response.hasMore = currentMonth.getTime() >= lowerBound.getTime();
    response.nextBefore = response.hasMore
      ? this.genericTimelineService.formatTimelineCursor(currentMonth)
      : null;

    return response;
  }
  // #endregion

  // #region Change Log
  async getRecordChangeLog(
    entityHandle: string,
    handle: string | number,
    _currentUser: PersonItem,
  ): Promise<ChangeLogResponseDto[]> {
    void _currentUser;

    const normalizedHandle = this.genericReferenceService.normalizeHandleValue(
      entityHandle,
      handle,
    );

    const items = await this.em.find(
      ChangeLogItem,
      {
        entity: { handle: entityHandle },
        reference: String(normalizedHandle),
      },
      {
        populate: ['action', 'entity', 'person', 'details'],
        orderBy: { createdAt: 'DESC', handle: 'DESC' },
      },
    );

    return items.map((item) => {
      const response = new ChangeLogResponseDto();
      response.handle = item.handle ?? 0;
      response.action = item.action.handle as ChangeLogAction;
      response.reference = item.reference;
      response.entity = {
        handle: item.entity.handle,
        icon: item.entity.icon ?? null,
      };
      response.person = this.genericSanitizerService.sanitizeEntityResult(
        'person',
        item.person,
      ) as ChangeLogResponseDto['person'];
      response.oldPayload = normalizeChangeLogPayload(item.oldPayload);
      response.newPayload = normalizeChangeLogPayload(item.newPayload);
      response.details = [...item.details]
        .sort((left, right) => (left.handle ?? 0) - (right.handle ?? 0))
        .map((detail) => ({
          property: detail.property,
          oldValue: normalizeChangeLogValue(detail.oldValue),
          newValue: normalizeChangeLogValue(detail.newValue),
        }));
      response.createdAt = item.createdAt ?? new Date();
      return response;
    });
  }
  // #endregion

  // #region Create
  /**
   * Creates a new entry for an entity, applies security, and runs before/after scripts.
   * @param {string} entityHandle Name of the entity
   * @param {object} data Data for the new entity
   * @param {PersonItem} currentUser Current user object
   * @returns {Promise<object>} The created entity
   */
  async create(
    entityHandle: string,
    data: { createdAt?: Date; updatedAt?: Date; [key: string]: any },
    currentUser: PersonItem,
    scriptContext: ScriptServerContext = {},
  ): Promise<object> {
    const template = this.templateService.getEntityTemplate(entityHandle);
    const splitPayload = this.genericCustomFieldService.splitPayload(data);
    data = splitPayload.data;
    await this.genericCustomFieldService.assertRequiredFields(
      entityHandle,
      splitPayload.customFields,
    );
    const submittedSnapshot = this.captureSubmittedChangeLogPayload(
      template,
      data,
    );

    this.genericPermissionService.checkTopLevelPermission(
      entityHandle,
      data,
      currentUser,
      'allowInsertStage',
    );

    const entity = await this.em.findOne(EntityItem, { handle: entityHandle });
    let newData: object;
    data = this.genericPayloadService.prepareCreatePayload(template, data);

    data = await this.genericMutationService.applyBeforeScript(
      ScriptMethods.beforeInsert,
      data,
      entity,
      currentUser,
      scriptContext,
    );

    await this.genericReferenceService.validateReferenceDependencies(
      entityHandle,
      data,
      template,
      currentUser,
    );

    const entityClass = this.genericQueryService.getEntityClass(entityHandle);

    newData = await this.genericMutationService.createAndFlush(
      entityHandle,
      entityClass,
      data,
      template,
    );

    if (entity) {
      const overwrittenData =
        await this.genericMutationService.applyAfterScript(
          ScriptMethods.afterInsert,
          newData,
          entity,
          currentUser,
          scriptContext,
        );

      if (overwrittenData !== newData) {
        newData = await this.genericMutationService.assignAndFlush(
          entityHandle,
          newData,
          overwrittenData,
          template,
        );
      }
    }

    this.scheduleBackgroundTask('changeLog', () =>
      this.safeStoreChangeLog(
        'create',
        entity,
        currentUser,
        null,
        submittedSnapshot,
      ),
    );

    this.scheduleBackgroundTask('openTaskCountChanges', () =>
      this.emitOpenTaskCountChangesForHandle(
        entityHandle,
        this.extractEntityHandle(newData),
      ),
    );

    await this.genericCustomFieldService.upsertCustomFieldValues(
      entityHandle,
      this.extractEntityHandle(newData),
      splitPayload.customFields,
    );

    const sanitized = this.genericSanitizerService.sanitizeEntityResult(
      entityHandle,
      newData,
      template,
    );
    return this.genericCustomFieldService.hydrateRecords(
      entityHandle,
      sanitized,
    );
  }

  // #endregion

  // #region Update
  /**
   * Updates an entry by its handle, applies security, and runs before/after scripts.
   * @param {string} entityHandle Name of the entity
   * @param {string | number} handle Handle of the entity
   * @param {object} data Data to update
   * @param {PersonItem} currentUser Current user object
   * @param {string[]} relations Relations to populate
   * @returns {Promise<object>} The updated entity
   */
  async update(
    entityHandle: string,
    handle: string | number,
    data: { createdAt?: Date; updatedAt?: Date; [key: string]: any },
    currentUser: PersonItem,
    relations: string[] = [],
    scriptContext: ScriptServerContext = {},
    concurrencyOptions: GenericUpdateConcurrencyOptions = {},
  ): Promise<object> {
    const updatePayload = this.extractUpdateConcurrencyMetadata(
      data,
      concurrencyOptions,
    );
    data = updatePayload.data;
    const splitPayload = this.genericCustomFieldService.splitPayload(data);
    data = splitPayload.data;
    const concurrency = updatePayload.concurrency;
    const previousOpenTaskUserHandles = await this.loadOpenTaskUserHandles(
      entityHandle,
      handle,
    );

    const entityClass = this.genericQueryService.getEntityClass(entityHandle);
    const entity = await this.em.findOne(EntityItem, { handle: entityHandle });
    const template = this.templateService.getEntityTemplate(entityHandle);
    let submittedSnapshot = this.captureSubmittedChangeLogPayload(
      template,
      data,
    );
    const populate = this.genericQueryService.buildPopulate(
      relations,
      template,
    );
    let newData: object;

    const handleFilter = this.genericReferenceService.getHandleFilter(
      entityHandle,
      handle,
    );
    const item = await this.em.findOne(entityClass, handleFilter, {
      populate: populate as any[],
    });

    if (!item) {
      throw new NotFoundException(`global.entityNotFound`);
    }

    const oldSnapshot = this.captureEntityChangeLogPayload(
      entityHandle,
      item,
      template,
      submittedSnapshot,
    );

    this.genericPermissionService.checkTopLevelPermission(
      entityHandle,
      { ...item, ...data },
      currentUser,
      'allowUpdateStage',
    );

    const conflict = this.evaluateUpdateConflict(
      entityHandle,
      item,
      template,
      submittedSnapshot,
      concurrency,
    );

    if (
      conflict.stale &&
      conflict.fields.length > 0 &&
      concurrency.resolution !== 'overwrite'
    ) {
      if (
        concurrency.resolution === 'merge' &&
        conflict.conflictingProperties.length === 0
      ) {
        data = this.buildAutomaticMergePayload(data, conflict);
        submittedSnapshot = this.captureSubmittedChangeLogPayload(
          template,
          data,
        );
      } else {
        throw new ConflictException(
          await this.buildUpdateConflictExceptionBody(
            entityHandle,
            handle,
            conflict,
          ),
        );
      }
    }

    data = this.genericPayloadService.prepareUpdatePayload(template, data);

    data = await this.genericMutationService.applyBeforeScript(
      ScriptMethods.beforeUpdate,
      data,
      entity,
      currentUser,
      { ...scriptContext, currentItems: [item] },
    );

    await this.genericReferenceService.validateReferenceDependencies(
      entityHandle,
      this.genericPayloadService.buildDependencyValidationPayload(item, data),
      template,
      currentUser,
    );

    newData = await this.genericMutationService.assignAndFlush(
      entityHandle,
      item,
      data,
      template,
    );

    if (entity && newData) {
      const overwrittenData =
        await this.genericMutationService.applyAfterScript(
          ScriptMethods.afterUpdate,
          newData,
          entity,
          currentUser,
          scriptContext,
        );

      if (overwrittenData !== newData) {
        newData = await this.genericMutationService.assignAndFlush(
          entityHandle,
          item,
          overwrittenData,
          template,
        );
      }
    }

    this.scheduleBackgroundTask('changeLog', () =>
      this.safeStoreChangeLog(
        'update',
        entity,
        currentUser,
        oldSnapshot,
        submittedSnapshot,
      ),
    );

    this.scheduleBackgroundTask('openTaskCountChanges', () =>
      this.emitOpenTaskCountChangesForHandle(
        entityHandle,
        handle,
        previousOpenTaskUserHandles,
      ),
    );

    await this.genericCustomFieldService.upsertCustomFieldValues(
      entityHandle,
      handle,
      splitPayload.customFields,
    );

    const sanitized = this.genericSanitizerService.sanitizeEntityResult(
      entityHandle,
      newData,
      template,
    );
    return this.genericCustomFieldService.hydrateRecords(
      entityHandle,
      sanitized,
    );
  }

  // #endregion

  // #region Delete
  /**
   * Deletes an entry by its handle, applies security, and runs before/after scripts.
   * @param {string} entityHandle Name of the entity
   * @param {string | number} handle Handle of the entity
   * @param {PersonItem} currentUser Current user object
   * @returns {Promise<void>} No return value
   */
  async delete(
    entityHandle: string,
    handle: string | number,
    currentUser: PersonItem,
    scriptContext: ScriptServerContext = {},
  ): Promise<void> {
    const previousOpenTaskUserHandles = await this.loadOpenTaskUserHandles(
      entityHandle,
      handle,
    );

    const entityClass = this.genericQueryService.getEntityClass(entityHandle);
    const template = this.templateService.getEntityTemplate(entityHandle);
    const handleFilter = this.genericReferenceService.getHandleFilter(
      entityHandle,
      handle,
    );
    let item = await this.em.findOne(entityClass, handleFilter);
    const entity = await this.em.findOne(EntityItem, { handle: entityHandle });

    if (!item) {
      throw new NotFoundException(`global.entityNotFound`);
    }

    const oldSnapshot = this.captureEntityChangeLogPayload(
      entityHandle,
      item,
      template,
    );

    this.genericPermissionService.checkTopLevelPermission(
      entityHandle,
      item,
      currentUser,
      'allowDeleteStage',
    );

    item = await this.genericMutationService.applyBeforeScript(
      ScriptMethods.beforeDelete,
      item,
      entity,
      currentUser,
      scriptContext,
    );

    const affectedRows = await this.genericMutationService.deleteAndFlush(
      entityHandle,
      entityClass,
      handleFilter,
    );

    if (affectedRows === 0) {
      throw new NotFoundException(`global.entityNotFound`);
    }

    if (entity) {
      await this.genericMutationService.applyAfterScript(
        ScriptMethods.afterDelete,
        item,
        entity,
        currentUser,
        scriptContext,
      );
    }

    this.scheduleBackgroundTask('changeLog', () =>
      this.safeStoreChangeLog('delete', entity, currentUser, oldSnapshot, null),
    );

    this.scheduleBackgroundTask('openTaskCountChanges', () => {
      this.openTaskEventsService.notifyUsers(previousOpenTaskUserHandles);
      return Promise.resolve();
    });
  }

  // #endregion

  // #region Reference
  /**
   * Adds references to an n:m relation without overwriting the entire relation.
   * @param {string} entityHandle Name of the entity
   * @param {string} referenceName Name of the reference relation
   * @param {string | number} entityHandleValue Handle of the entity
   * @param {string | number} referenceHandleValue Handle of the reference
   * @param {PersonItem} currentUser Current user object
   * @returns {Promise<object>} Result of reference creation
   */
  async createReference(
    entityHandle: string,
    referenceName: string,
    entityHandleValue: string | number,
    referenceHandleValue: string | number,
    currentUser: PersonItem,
    scriptContext: ScriptServerContext = {},
  ): Promise<object> {
    const previousOpenTaskUserHandles =
      await this.loadReferenceOpenTaskUserHandles(
        entityHandle,
        referenceName,
        entityHandleValue,
      );

    const entity = await this.em.findOne(EntityItem, { handle: entityHandle });
    const mutation = await this.genericRelationService.addReferenceAndFlush(
      entityHandle,
      referenceName,
      entityHandleValue,
      referenceHandleValue,
      currentUser,
    );
    let newData = mutation.item;

    if (entity) {
      const overwrittenData =
        await this.genericMutationService.applyAfterScript(
          ScriptMethods.addReference,
          newData,
          entity,
          currentUser,
          {
            ...scriptContext,
            referenceName,
            referenceItems: [mutation.referenceItem],
          },
        );

      if (overwrittenData !== newData) {
        newData = (await this.genericMutationService.assignAndFlush(
          entityHandle,
          newData,
          overwrittenData,
          mutation.template,
        )) as Record<string, unknown>;
      }
    }

    const ownerUpdate = await this.triggerOwningRelationAfterUpdate(
      entityHandle,
      entity,
      mutation,
      currentUser,
      scriptContext,
    );
    if (ownerUpdate?.entityHandle === entityHandle) {
      newData = ownerUpdate.item;
    }

    await this.emitReferenceOpenTaskCountChanges(
      entityHandle,
      referenceName,
      entityHandleValue,
      previousOpenTaskUserHandles,
    );

    return this.genericSanitizerService.sanitizeEntityResult(
      entityHandle,
      newData,
      mutation.template,
    );
  }

  /**
   * Removes references from an n:m relation without overwriting the entire relation.
   * @param {string} entityHandle Name of the entity
   * @param {string} referenceName Name of the reference relation
   * @param {string | number} entityHandleValue Handle of the entity
   * @param {string | number} referenceHandleValue Handle of the reference
   * @param {PersonItem} currentUser Current user object
   * @returns {Promise<object>} Result of reference deletion
   */
  async deleteReference(
    entityHandle: string,
    referenceName: string,
    entityHandleValue: string | number,
    referenceHandleValue: string | number,
    currentUser: PersonItem,
    scriptContext: ScriptServerContext = {},
  ): Promise<object> {
    const previousOpenTaskUserHandles =
      await this.loadReferenceOpenTaskUserHandles(
        entityHandle,
        referenceName,
        entityHandleValue,
      );

    const entity = await this.em.findOne(EntityItem, { handle: entityHandle });
    const mutation = await this.genericRelationService.deleteReferenceAndFlush(
      entityHandle,
      referenceName,
      entityHandleValue,
      referenceHandleValue,
      currentUser,
    );
    let newData = mutation.item;

    if (entity) {
      const overwrittenData =
        await this.genericMutationService.applyAfterScript(
          ScriptMethods.deleteReference,
          newData,
          entity,
          currentUser,
          {
            ...scriptContext,
            referenceName,
            referenceItems: [mutation.referenceItem],
          },
        );

      if (overwrittenData !== newData) {
        newData = (await this.genericMutationService.assignAndFlush(
          entityHandle,
          newData,
          overwrittenData,
          mutation.template,
        )) as Record<string, unknown>;
      }
    }

    const ownerUpdate = await this.triggerOwningRelationAfterUpdate(
      entityHandle,
      entity,
      mutation,
      currentUser,
      scriptContext,
    );
    if (ownerUpdate?.entityHandle === entityHandle) {
      newData = ownerUpdate.item;
    }

    await this.emitReferenceOpenTaskCountChanges(
      entityHandle,
      referenceName,
      entityHandleValue,
      previousOpenTaskUserHandles,
    );

    return this.genericSanitizerService.sanitizeEntityResult(
      entityHandle,
      newData,
      mutation.template,
    );
  }
  // #endregion

  private async triggerOwningRelationAfterUpdate(
    entityHandle: string,
    entity: EntityItem | null,
    mutation: RelationMutationContext,
    currentUser: PersonItem,
    scriptContext: ScriptServerContext,
  ): Promise<{ entityHandle: string; item: Record<string, unknown> } | null> {
    const ownerContext = await this.resolveOwningRelationUpdateContext(
      entityHandle,
      entity,
      mutation,
    );
    if (!ownerContext?.entity) {
      return null;
    }

    // Touch the owning record so relation-only changes also advance updatedAt.
    ownerContext.item.updatedAt = new Date();
    await this.em.flush();

    const overwrittenData = await this.genericMutationService.applyAfterScript(
      ScriptMethods.afterUpdate,
      ownerContext.item,
      ownerContext.entity,
      currentUser,
      {
        ...scriptContext,
        referenceName: ownerContext.referenceName,
        referenceItems: ownerContext.referenceItems,
        currentItems: [ownerContext.item],
      },
    );

    let persistedItem = ownerContext.item;
    if (overwrittenData !== ownerContext.item) {
      persistedItem = (await this.genericMutationService.assignAndFlush(
        ownerContext.entityHandle,
        ownerContext.item,
        overwrittenData,
        ownerContext.template,
      )) as Record<string, unknown>;
    }

    return {
      entityHandle: ownerContext.entityHandle,
      item: persistedItem,
    };
  }

  private async resolveOwningRelationUpdateContext(
    entityHandle: string,
    entity: EntityItem | null,
    mutation: RelationMutationContext,
  ): Promise<{
    entity: EntityItem | null;
    entityHandle: string;
    item: Record<string, unknown>;
    referenceItems: object[];
    referenceName: string;
    template: EntityTemplateDto[];
  } | null> {
    const field = mutation.field;

    if (!field.isReference) {
      return null;
    }

    if (field.kind === '1:m' || field.kind === 'm:n') {
      return {
        entity,
        entityHandle,
        item: mutation.item,
        referenceItems: [mutation.referenceItem],
        referenceName: field.name,
        template: mutation.template,
      };
    }

    if (field.kind !== 'n:m') {
      return null;
    }

    const ownerReferenceName = field.mappedBy ?? field.inversedBy ?? null;
    if (!ownerReferenceName) {
      return null;
    }

    return {
      entity: await this.em.findOne(EntityItem, {
        handle: mutation.referenceEntityHandle,
      }),
      entityHandle: mutation.referenceEntityHandle,
      item: mutation.referenceItem as Record<string, unknown>,
      referenceItems: [mutation.item],
      referenceName: ownerReferenceName,
      template: this.templateService.getEntityTemplate(
        mutation.referenceEntityHandle,
      ),
    };
  }

  private async emitOpenTaskCountChangesForHandle(
    entityHandle: string,
    handle: string | number | null,
    previousUserHandles: ReadonlySet<number> = new Set<number>(),
  ): Promise<void> {
    if (handle == null) {
      this.openTaskEventsService.notifyUsers(previousUserHandles);
      return;
    }

    const nextUserHandles = await this.loadOpenTaskUserHandles(
      entityHandle,
      handle,
    );
    this.openTaskEventsService.notifyUsers(
      this.mergeUserHandles(previousUserHandles, nextUserHandles),
    );
  }

  private async emitReferenceOpenTaskCountChanges(
    entityHandle: string,
    referenceName: string,
    handle: string | number,
    previousUserHandles: ReadonlySet<number>,
  ): Promise<void> {
    const nextUserHandles = await this.loadReferenceOpenTaskUserHandles(
      entityHandle,
      referenceName,
      handle,
    );

    this.openTaskEventsService.notifyUsers(
      this.mergeUserHandles(previousUserHandles, nextUserHandles),
    );
  }

  private async loadReferenceOpenTaskUserHandles(
    entityHandle: string,
    referenceName: string,
    handle: string | number,
  ): Promise<Set<number>> {
    if (entityHandle !== 'event' || referenceName !== 'participants') {
      return new Set<number>();
    }

    return this.loadOpenTaskUserHandles(entityHandle, handle);
  }

  private async loadOpenTaskUserHandles(
    entityHandle: string,
    handle: string | number,
  ): Promise<Set<number>> {
    if (!OPEN_TASK_ENTITY_HANDLES.has(entityHandle)) {
      return new Set<number>();
    }

    switch (entityHandle) {
      case 'ticket':
        return this.loadTicketOpenTaskUserHandles(handle);
      case 'event':
        return this.loadEventOpenTaskUserHandles(handle);
      case 'salesOpportunity':
        return this.loadSalesOpportunityOpenTaskUserHandles(handle);
      case 'effortEstimate':
        return this.loadEffortEstimateOpenTaskUserHandles(handle);
      default:
        return new Set<number>();
    }
  }

  private async loadTicketOpenTaskUserHandles(
    handle: string | number,
  ): Promise<Set<number>> {
    const normalizedHandle = this.normalizeNumericOpenTaskHandle(
      'ticket',
      handle,
    );
    if (normalizedHandle == null) {
      return new Set<number>();
    }

    const ticket = await this.em.findOne(
      TicketItem,
      { handle: normalizedHandle },
      {
        populate: ['assigneePerson', 'status'],
      },
    );

    if (!ticket) {
      return new Set<number>();
    }

    const assigneeHandle = this.extractOpenTaskReferenceHandle(
      ticket.assigneePerson,
    );
    const statusHandle = this.extractOpenTaskReferenceHandle(ticket.status);

    if (typeof assigneeHandle !== 'number' || statusHandle === 'closed') {
      return new Set<number>();
    }

    return new Set<number>([assigneeHandle]);
  }

  private async loadEventOpenTaskUserHandles(
    handle: string | number,
  ): Promise<Set<number>> {
    const normalizedHandle = this.normalizeNumericOpenTaskHandle(
      'event',
      handle,
    );
    if (normalizedHandle == null) {
      return new Set<number>();
    }

    const event = await this.em.findOne(
      EventItem,
      { handle: normalizedHandle },
      {
        populate: ['participants', 'status'],
      },
    );

    if (!event) {
      return new Set<number>();
    }

    const statusHandle = this.extractOpenTaskReferenceHandle(event.status);
    if (statusHandle === 'canceled' || statusHandle === 'completed') {
      return new Set<number>();
    }

    return new Set<number>(
      event.participants
        .getItems()
        .map((participant) => participant.handle)
        .filter(
          (participantHandle): participantHandle is number =>
            typeof participantHandle === 'number',
        ),
    );
  }

  private async loadSalesOpportunityOpenTaskUserHandles(
    handle: string | number,
  ): Promise<Set<number>> {
    const normalizedHandle = this.normalizeNumericOpenTaskHandle(
      'salesOpportunity',
      handle,
    );
    if (normalizedHandle == null) {
      return new Set<number>();
    }

    const salesOpportunity = await this.em.findOne(
      SalesOpportunityItem,
      { handle: normalizedHandle },
      {
        populate: ['assigneePerson'],
      },
    );

    if (!salesOpportunity || salesOpportunity.isActive !== true) {
      return new Set<number>();
    }

    const assigneeHandle = this.extractOpenTaskReferenceHandle(
      salesOpportunity.assigneePerson,
    );

    if (typeof assigneeHandle !== 'number') {
      return new Set<number>();
    }

    return new Set<number>([assigneeHandle]);
  }

  private async loadEffortEstimateOpenTaskUserHandles(
    handle: string | number,
  ): Promise<Set<number>> {
    const normalizedHandle = this.normalizeNumericOpenTaskHandle(
      'effortEstimate',
      handle,
    );
    if (normalizedHandle == null) {
      return new Set<number>();
    }

    const effortEstimate = await this.em.findOne(
      EffortEstimateItem,
      { handle: normalizedHandle },
      {
        populate: ['assigneePerson', 'status'],
      },
    );

    if (!effortEstimate || effortEstimate.isActive !== true) {
      return new Set<number>();
    }

    const statusHandle = this.extractOpenTaskReferenceHandle(
      effortEstimate.status,
    );
    if (statusHandle === 'completed' || statusHandle === 'cancelled') {
      return new Set<number>();
    }

    const assigneeHandle = this.extractOpenTaskReferenceHandle(
      effortEstimate.assigneePerson,
    );
    if (typeof assigneeHandle !== 'number') {
      return new Set<number>();
    }

    return new Set<number>([assigneeHandle]);
  }

  private mergeUserHandles(
    ...userHandleCollections: Iterable<number>[]
  ): Set<number> {
    const mergedUserHandles = new Set<number>();

    for (const userHandleCollection of userHandleCollections) {
      for (const userHandle of userHandleCollection) {
        mergedUserHandles.add(userHandle);
      }
    }

    return mergedUserHandles;
  }

  private extractOpenTaskReferenceHandle(
    reference: unknown,
  ): string | number | undefined {
    if (!reference || typeof reference !== 'object') {
      return undefined;
    }

    const handle = (reference as { handle?: unknown }).handle;
    if (typeof handle === 'string' || typeof handle === 'number') {
      return handle;
    }

    return undefined;
  }

  private extractEntityHandle(item: object): string | number | null {
    const handle = (item as { handle?: unknown }).handle;

    if (typeof handle === 'string' || typeof handle === 'number') {
      return handle;
    }

    return null;
  }

  private scheduleBackgroundTask(
    label: string,
    operation: () => Promise<void>,
  ): void {
    setImmediate(() => {
      void operation().catch((error) => {
        global.log?.error?.(`${label}:`, error);
      });
    });
  }

  private removeCustomFieldOrderBy(orderBy: object): object {
    if (!orderBy || typeof orderBy !== 'object' || Array.isArray(orderBy)) {
      return orderBy;
    }

    return Object.fromEntries(
      Object.entries(orderBy as Record<string, unknown>).filter(
        ([key]) => !key.startsWith('customFields.'),
      ),
    );
  }

  private normalizeNumericOpenTaskHandle(
    entityHandle: 'ticket' | 'event' | 'salesOpportunity' | 'effortEstimate',
    handle: string | number,
  ): number | null {
    const normalizedHandle = this.genericReferenceService.normalizeHandleValue(
      entityHandle,
      handle,
    );

    return typeof normalizedHandle === 'number' ? normalizedHandle : null;
  }

  private async findTimelineRecord(
    entityHandle: string,
    where: object,
    template: EntityTemplateDto[],
    currentUser: PersonItem,
  ): Promise<Record<string, unknown> | null> {
    const entityClass = this.genericQueryService.getEntityClass(entityHandle);
    const populate = this.genericQueryService.buildPopulate(['m:1'], template);
    const readResult = await this.genericReadService.findOne(
      entityHandle,
      entityClass,
      where,
      currentUser,
      template,
      {
        populate: populate as any[],
      },
    );
    const record = readResult.item;

    if (!record) {
      return null;
    }

    return this.genericSanitizerService.sanitizeEntityResult(
      entityHandle,
      record,
      template,
    );
  }

  private async loadTimelineDescriptorDatasets(
    descriptors: TimelineRelationDescriptor[],
    mainHandle: string | number,
    currentUser: PersonItem,
    cursorMonth: Date,
  ): Promise<TimelineDescriptorDataset[]> {
    const cursorWindow =
      this.genericTimelineService.createTimelineMonthWindow(cursorMonth);

    return Promise.all(
      descriptors.map(async (descriptor) => {
        const relationFilter =
          this.genericTimelineService.buildTimelineReverseFilter(
            descriptor.relationFields,
            mainHandle,
          );
        const records = await this.findTimelineRecords(
          descriptor.entityHandle,
          this.genericTimelineService.combineWhere(
            relationFilter,
            this.genericTimelineService.buildTimelineRecordUpperBoundFilter(
              descriptor.dateFields,
              cursorWindow.end,
            ),
          ),
          descriptor.template,
          currentUser,
        );

        return {
          descriptor,
          relationFilter,
          records,
        };
      }),
    );
  }

  private async findTimelineRecords(
    entityHandle: string,
    where: object,
    template: EntityTemplateDto[],
    currentUser: PersonItem,
  ): Promise<Record<string, unknown>[]> {
    const entityClass =
      this.genericQueryService.getEntityClass<TimelineRecordResult>(
        entityHandle,
      );
    const populate = this.genericQueryService.buildPopulate(['m:1'], template);
    const readResult = await this.genericReadService.find(
      entityHandle,
      entityClass,
      where,
      currentUser,
      template,
      {
        populate,
        orderBy: { updatedAt: 'DESC', createdAt: 'DESC' },
      },
    );
    const records = readResult.items as TimelineRecordResult[];

    return this.genericSanitizerService.sanitizeEntityResult(
      entityHandle,
      records,
      template,
    );
  }

  private extractUpdateConcurrencyMetadata(
    data: { createdAt?: Date; updatedAt?: Date; [key: string]: any },
    options: GenericUpdateConcurrencyOptions = {},
  ): {
    data: { createdAt?: Date; updatedAt?: Date; [key: string]: any };
    concurrency: NormalizedUpdateConcurrencyMetadata;
  } {
    const nextData = { ...data };
    const rawMetadata = this.asUnknownRecord(
      nextData[GENERIC_CONCURRENCY_METADATA_KEY],
    );
    delete nextData[GENERIC_CONCURRENCY_METADATA_KEY];

    const metadata: Record<string, unknown> = {
      ...(rawMetadata ?? {}),
    };

    if (metadata.expectedUpdatedAt == null && metadata.baseUpdatedAt != null) {
      metadata.expectedUpdatedAt = metadata.baseUpdatedAt;
    }

    if (metadata.expectedUpdatedAt == null && nextData.updatedAt != null) {
      metadata.expectedUpdatedAt = nextData.updatedAt;
    }
    delete nextData.updatedAt;

    if (options.expectedUpdatedAt !== undefined) {
      metadata.expectedUpdatedAt = options.expectedUpdatedAt;
    }

    if (options.basePayload !== undefined) {
      metadata.basePayload = options.basePayload;
    }

    if (options.resolution) {
      metadata.resolution = options.resolution;
    }

    if (options.merge === true) {
      metadata.resolution = 'merge';
    }

    const mergeRequested = normalizeBoolean(metadata.merge);
    const forceRequested = normalizeBoolean(metadata.force);
    const resolution =
      forceRequested === true
        ? 'overwrite'
        : mergeRequested === true
          ? 'merge'
          : this.normalizeConcurrencyResolution(metadata.resolution);

    return {
      data: nextData,
      concurrency: {
        expectedUpdatedAt: normalizeConcurrencyTimestamp(
          metadata.expectedUpdatedAt,
        ),
        basePayload: normalizeConcurrencyBasePayload(metadata.basePayload),
        resolution,
      },
    };
  }

  private evaluateUpdateConflict(
    entityHandle: string,
    item: object,
    template: EntityTemplateDto[],
    attemptedPayload: ChangeLogPayload,
    concurrency: NormalizedUpdateConcurrencyMetadata,
  ): UpdateConflictEvaluation {
    const expectedUpdatedAt = concurrency.expectedUpdatedAt ?? null;
    const currentUpdatedAt = normalizeConcurrencyTimestamp(
      (item as { updatedAt?: unknown }).updatedAt,
    );
    const basePayload = this.projectUpdateConflictPayload(
      template,
      concurrency.basePayload ?? null,
    );
    const attemptedConflictPayload = this.projectUpdateConflictPayload(
      template,
      attemptedPayload,
    );
    const comparisonShape = mergeChangeLogPayloadShape(
      basePayload,
      attemptedConflictPayload,
    );
    const currentPayload = comparisonShape
      ? this.captureEntityChangeLogPayload(
          entityHandle,
          item,
          template,
          comparisonShape,
        )
      : null;
    const stale =
      expectedUpdatedAt != null &&
      currentUpdatedAt != null &&
      expectedUpdatedAt !== currentUpdatedAt;
    const fields = stale
      ? this.buildUpdateConflictFields(
          basePayload,
          currentPayload,
          attemptedConflictPayload,
        )
      : [];
    const conflictingProperties = fields
      .filter((field) => field.conflict)
      .map((field) => field.property);
    const mergeableProperties = fields
      .filter((field) => field.changedInAttempt && !field.conflict)
      .map((field) => field.property);

    return {
      stale,
      expectedUpdatedAt,
      currentUpdatedAt,
      basePayload,
      currentPayload,
      attemptedPayload: attemptedConflictPayload,
      fields,
      conflictingProperties,
      mergeableProperties,
    };
  }

  private buildUpdateConflictFields(
    basePayload: ChangeLogPayload,
    currentPayload: ChangeLogPayload,
    attemptedPayload: ChangeLogPayload,
  ): UpdateConflictField[] {
    const baseRecord = asChangeLogRecord(basePayload);
    const currentRecord = asChangeLogRecord(currentPayload);
    const attemptedRecord = asChangeLogRecord(attemptedPayload);
    const hasBasePayload = basePayload != null;
    const propertyNames = new Set([
      ...Object.keys(baseRecord),
      ...Object.keys(attemptedRecord),
    ]);

    return [...propertyNames]
      .filter((property) => !UPDATE_CONFLICT_IGNORED_FIELDS.has(property))
      .sort((left, right) => left.localeCompare(right))
      .map((property) => {
        const attemptedHasProperty = this.hasOwnRecordProperty(
          attemptedRecord,
          property,
        );
        const baseValue = normalizeUpdateConflictValue(baseRecord[property]);
        const currentValue = normalizeUpdateConflictValue(
          currentRecord[property],
        );
        const attemptedValue = attemptedHasProperty
          ? normalizeUpdateConflictValue(attemptedRecord[property])
          : baseValue;
        const changedInAttempt = hasBasePayload
          ? !areUpdateConflictValuesEqual(baseValue, attemptedValue)
          : attemptedHasProperty;
        const changedInCurrent = hasBasePayload
          ? !areUpdateConflictValuesEqual(baseValue, currentValue)
          : !areUpdateConflictValuesEqual(currentValue, attemptedValue);
        const conflict =
          changedInAttempt &&
          changedInCurrent &&
          !areUpdateConflictValuesEqual(currentValue, attemptedValue);

        return {
          property,
          baseValue,
          currentValue,
          attemptedValue,
          changedInCurrent,
          changedInAttempt,
          conflict,
        };
      })
      .filter(
        (field) =>
          field.changedInCurrent || field.changedInAttempt || field.conflict,
      );
  }

  private projectUpdateConflictPayload(
    template: EntityTemplateDto[],
    payload: ChangeLogPayload,
  ): ChangeLogPayload {
    if (!payload) {
      return null;
    }

    const comparableTemplate = template.filter((field) =>
      this.isUpdateConflictComparableField(field),
    );
    const comparableFieldNames = new Set(
      comparableTemplate
        .map((field) => field.name)
        .filter((name): name is string => typeof name === 'string'),
    );
    const sourceRecord = asChangeLogRecord(payload);
    const comparablePayload = Object.fromEntries(
      Object.entries(sourceRecord).filter(([key]) =>
        comparableFieldNames.has(key),
      ),
    );

    if (Object.keys(comparablePayload).length === 0) {
      return null;
    }

    return projectChangeLogPayload(comparableTemplate, comparablePayload);
  }

  private isUpdateConflictComparableField(field: EntityTemplateDto): boolean {
    if (!field.name || field.isPersistent === false) {
      return false;
    }

    if (field.kind === 'm:1') {
      return true;
    }

    if (field.isReference) {
      return false;
    }

    return !['1:m', 'm:n', 'n:m', '1:1'].includes(field.kind ?? '');
  }

  private buildAutomaticMergePayload(
    data: { createdAt?: Date; updatedAt?: Date; [key: string]: any },
    conflict: UpdateConflictEvaluation,
  ): { createdAt?: Date; updatedAt?: Date; [key: string]: any } {
    const mergeableProperties = new Set(conflict.mergeableProperties);
    const mergedData = Object.fromEntries(
      Object.entries(data).filter(([key]) => mergeableProperties.has(key)),
    ) as { createdAt?: Date; updatedAt?: Date } & Record<string, unknown>;
    const dataRecord = data as Record<string, unknown>;

    if (
      !this.hasOwnRecordProperty(mergedData, 'handle') &&
      this.hasOwnRecordProperty(dataRecord, 'handle')
    ) {
      mergedData.handle = dataRecord.handle;
    }

    return mergedData;
  }

  private async buildUpdateConflictExceptionBody(
    entityHandle: string,
    handle: string | number,
    conflict: UpdateConflictEvaluation,
  ): Promise<Record<string, unknown>> {
    const normalizedHandle = this.genericReferenceService.normalizeHandleValue(
      entityHandle,
      handle,
    );
    const current = {
      ...asChangeLogRecord(conflict.currentPayload),
      handle: normalizedHandle,
      updatedAt: conflict.currentUpdatedAt,
    };

    return {
      message: 'exception.concurrentUpdate',
      error: 'Der Datensatz wurde seit dem Oeffnen geaendert.',
      details: {
        summary:
          'Der Datensatz wurde inzwischen von einer anderen Person geaendert. Bitte pruefe die Aenderungen und fuehre sie zusammen.',
        reason: 'staleRecord',
        entityHandle,
        handle: normalizedHandle,
        expectedUpdatedAt: conflict.expectedUpdatedAt,
        currentUpdatedAt: conflict.currentUpdatedAt,
        autoMergeable: conflict.conflictingProperties.length === 0,
        conflictingProperties: conflict.conflictingProperties,
        mergeableProperties: conflict.mergeableProperties,
        base: conflict.basePayload,
        current,
        attempted: conflict.attemptedPayload,
        fields: conflict.fields,
        latestChange: await this.findLatestConflictChange(
          entityHandle,
          normalizedHandle,
        ),
      },
      technical: {
        operation: 'generic.update',
        entityHandle,
        handle: normalizedHandle,
        expectedUpdatedAt: conflict.expectedUpdatedAt,
        currentUpdatedAt: conflict.currentUpdatedAt,
      },
    };
  }

  private async findLatestConflictChange(
    entityHandle: string,
    handle: string | number,
  ): Promise<Record<string, unknown> | null> {
    try {
      const latestChange = await this.em.findOne(
        ChangeLogItem,
        {
          entity: { handle: entityHandle },
          reference: String(handle),
        },
        {
          populate: ['action', 'entity', 'person'],
          orderBy: { createdAt: 'DESC', handle: 'DESC' },
        },
      );

      if (!latestChange) {
        return null;
      }

      return {
        handle: latestChange.handle ?? null,
        action: latestChange.action?.handle ?? null,
        createdAt: latestChange.createdAt ?? null,
        person: this.genericSanitizerService.sanitizeEntityResult(
          'person',
          latestChange.person,
        ),
      };
    } catch (error) {
      global.log?.warn?.('updateConflict.latestChange:', error);
      return null;
    }
  }

  private normalizeConcurrencyResolution(
    value: unknown,
  ): GenericUpdateConcurrencyResolution | undefined {
    return value === 'merge' || value === 'overwrite' || value === 'detect'
      ? value
      : undefined;
  }

  private asUnknownRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }

  private hasOwnRecordProperty(record: object, property: PropertyKey): boolean {
    return Object.prototype.hasOwnProperty.call(record, property) === true;
  }

  private async safeStoreChangeLog(
    action: ChangeLogAction,
    entity: EntityItem | null,
    currentUser: PersonItem,
    oldPayload: ChangeLogPayload,
    newPayload: ChangeLogPayload,
  ): Promise<void> {
    try {
      await this.storeChangeLog(
        action,
        entity,
        currentUser,
        oldPayload,
        newPayload,
      );
    } catch (error) {
      global.log?.error?.('changeLog:', error);
    }
  }

  private async storeChangeLog(
    action: ChangeLogAction,
    entity: EntityItem | null,
    currentUser: PersonItem,
    oldPayload: ChangeLogPayload,
    newPayload: ChangeLogPayload,
  ): Promise<void> {
    if (
      !entity ||
      entity.handle == null ||
      currentUser.handle == null ||
      typeof this.em.create !== 'function' ||
      typeof this.em.flush !== 'function'
    ) {
      return;
    }

    const reference = extractChangeLogReference(newPayload ?? oldPayload);
    if (reference == null) {
      return;
    }

    const logEm = typeof this.em.fork === 'function' ? this.em.fork() : this.em;

    const actionEntity = await logEm.findOne(ChangeLogActionItem, {
      handle: action,
    });
    if (!actionEntity) {
      return;
    }

    const log = logEm.create(ChangeLogItem, {
      action: actionEntity.handle,
      reference: String(reference),
      entity: entity.handle,
      person: currentUser.handle,
      oldPayload,
      newPayload,
    } as any);
    const details = buildChangeLogDetails(action, oldPayload, newPayload);

    for (const detail of details) {
      log.details.add(
        logEm.create(ChangeLogDetailItem, {
          log,
          property: detail.property,
          oldValue: detail.oldValue,
          newValue: detail.newValue,
        }),
      );
    }

    await logEm.flush();
  }

  private captureEntityChangeLogPayload(
    entityHandle: string,
    value: object,
    template: EntityTemplateDto[],
    shapeSource?: ChangeLogPayload,
  ): ChangeLogPayload {
    const sanitized = normalizeChangeLogPayload(
      this.genericSanitizerService.sanitizeEntityResult(
        entityHandle,
        value,
        template,
      ) as Record<string, unknown>,
    );

    return projectChangeLogPayload(template, sanitized, shapeSource);
  }

  private captureSubmittedChangeLogPayload(
    template: EntityTemplateDto[],
    payload: Record<string, unknown> | null | undefined,
  ): ChangeLogPayload {
    if (!payload) {
      return null;
    }

    const normalized = normalizeChangeLogPayload({
      ...payload,
    });

    return projectChangeLogPayload(template, normalized);
  }
  // #endregion
}
