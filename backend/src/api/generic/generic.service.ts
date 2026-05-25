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
import { ChangeLogActionItem } from '../../entity/ChangeLogActionItem';
import { EventItem } from '../../entity/EventItem';
import { OpenTaskEventsService } from '../current/open-task-events.service';
import { SalesOpportunityItem } from '../../entity/SalesOpportunityItem';
import { TicketItem } from '../../entity/TicketItem';
import {
  GenericTimelineService,
  TimelineDescriptorDataset,
  TimelineRecordResult,
  TimelineRelationDescriptor,
} from './generic-timeline.service';
import { GENERIC_DOWNLOAD_LIMIT } from '../../constants/project.constants';

type ChangeLogPayload = Record<string, unknown> | null;
type ChangeLogAction = 'create' | 'update' | 'delete';
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
const CHANGE_LOG_DETAIL_IGNORED_FIELDS = new Set(['updatedAt']);
const UPDATE_CONFLICT_IGNORED_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  GENERIC_CONCURRENCY_METADATA_KEY,
]);
const OPEN_TASK_ENTITY_HANDLES = new Set([
  'ticket',
  'event',
  'salesOpportunity',
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
    where = this.genericQueryService.normalizeQueryCriteria(
      entityHandle,
      where,
      'filter',
    );
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
    where = this.genericQueryService.normalizeQueryCriteria(
      entityHandle,
      where,
      'filter',
    );
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
    return JSON.stringify(result.items, null, 2);
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
      response.oldPayload = this.normalizeChangeLogPayload(item.oldPayload);
      response.newPayload = this.normalizeChangeLogPayload(item.newPayload);
      response.details = [...item.details]
        .sort((left, right) => (left.handle ?? 0) - (right.handle ?? 0))
        .map((detail) => ({
          property: detail.property,
          oldValue: this.normalizeChangeLogValue(detail.oldValue),
          newValue: this.normalizeChangeLogValue(detail.newValue),
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

    return this.genericSanitizerService.sanitizeEntityResult(
      entityHandle,
      newData,
      template,
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

    return this.genericSanitizerService.sanitizeEntityResult(
      entityHandle,
      newData,
      template,
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

  private normalizeNumericOpenTaskHandle(
    entityHandle: 'ticket' | 'event' | 'salesOpportunity',
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

    const mergeRequested = this.normalizeBoolean(metadata.merge);
    const forceRequested = this.normalizeBoolean(metadata.force);
    const resolution =
      forceRequested === true
        ? 'overwrite'
        : mergeRequested === true
          ? 'merge'
          : this.normalizeConcurrencyResolution(metadata.resolution);

    return {
      data: nextData,
      concurrency: {
        expectedUpdatedAt: this.normalizeConcurrencyTimestamp(
          metadata.expectedUpdatedAt,
        ),
        basePayload: this.normalizeConcurrencyBasePayload(
          metadata.basePayload,
        ),
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
    const currentUpdatedAt = this.normalizeConcurrencyTimestamp(
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
    const comparisonShape = this.mergeChangeLogPayloadShape(
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
    const baseRecord = this.asChangeLogRecord(basePayload);
    const currentRecord = this.asChangeLogRecord(currentPayload);
    const attemptedRecord = this.asChangeLogRecord(attemptedPayload);
    const hasBasePayload = basePayload != null;
    const propertyNames = new Set([
      ...Object.keys(baseRecord),
      ...Object.keys(attemptedRecord),
    ]);

    return [...propertyNames]
      .filter((property) => !UPDATE_CONFLICT_IGNORED_FIELDS.has(property))
      .sort((left, right) => left.localeCompare(right))
      .map((property) => {
        const attemptedHasProperty = Object.prototype.hasOwnProperty.call(
          attemptedRecord,
          property,
        );
        const baseValue = this.normalizeUpdateConflictValue(
          baseRecord[property],
        );
        const currentValue = this.normalizeUpdateConflictValue(
          currentRecord[property],
        );
        const attemptedValue = attemptedHasProperty
          ? this.normalizeUpdateConflictValue(attemptedRecord[property])
          : baseValue;
        const changedInAttempt = hasBasePayload
          ? !this.areUpdateConflictValuesEqual(baseValue, attemptedValue)
          : attemptedHasProperty;
        const changedInCurrent = hasBasePayload
          ? !this.areUpdateConflictValuesEqual(baseValue, currentValue)
          : !this.areUpdateConflictValuesEqual(currentValue, attemptedValue);
        const conflict =
          changedInAttempt &&
          changedInCurrent &&
          !this.areUpdateConflictValuesEqual(currentValue, attemptedValue);

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
    const sourceRecord = this.asChangeLogRecord(payload);
    const comparablePayload = Object.fromEntries(
      Object.entries(sourceRecord).filter(([key]) =>
        comparableFieldNames.has(key),
      ),
    );

    if (Object.keys(comparablePayload).length === 0) {
      return null;
    }

    return this.projectChangeLogPayload(comparableTemplate, comparablePayload);
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
    ) as { createdAt?: Date; updatedAt?: Date; [key: string]: any };

    if (
      !Object.prototype.hasOwnProperty.call(mergedData, 'handle') &&
      Object.prototype.hasOwnProperty.call(data, 'handle')
    ) {
      mergedData.handle = data.handle;
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
      ...this.asChangeLogRecord(conflict.currentPayload),
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

  private mergeChangeLogPayloadShape(
    ...payloads: ChangeLogPayload[]
  ): ChangeLogPayload {
    const shape: Record<string, unknown> = {};

    for (const payload of payloads) {
      const record = this.asChangeLogRecord(payload);
      for (const key of Object.keys(record)) {
        shape[key] = record[key];
      }
    }

    return Object.keys(shape).length > 0 ? shape : null;
  }

  private normalizeConcurrencyBasePayload(value: unknown): ChangeLogPayload {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return this.normalizeChangeLogPayload(value as Record<string, unknown>);
  }

  private normalizeConcurrencyResolution(
    value: unknown,
  ): GenericUpdateConcurrencyResolution | undefined {
    return value === 'merge' || value === 'overwrite' || value === 'detect'
      ? value
      : undefined;
  }

  private normalizeConcurrencyTimestamp(value: unknown): string | null {
    if (value == null) {
      return null;
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value.toISOString();
    }

    if (typeof value !== 'string' && typeof value !== 'number') {
      return null;
    }

    const rawValue = String(value).trim();
    if (!rawValue) {
      return null;
    }

    const parsedDate = new Date(rawValue);
    return Number.isNaN(parsedDate.getTime())
      ? rawValue
      : parsedDate.toISOString();
  }

  private normalizeBoolean(value: unknown): boolean | null {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value !== 'string') {
      return null;
    }

    const normalizedValue = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalizedValue)) {
      return true;
    }

    if (['0', 'false', 'no', 'off'].includes(normalizedValue)) {
      return false;
    }

    return null;
  }

  private asUnknownRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
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

    const reference = this.extractChangeLogReference(newPayload ?? oldPayload);
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
    const details = this.buildChangeLogDetails(action, oldPayload, newPayload);

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

  private buildChangeLogDetails(
    action: ChangeLogAction,
    oldPayload: ChangeLogPayload,
    newPayload: ChangeLogPayload,
  ): Array<{
    property: string;
    oldValue: unknown;
    newValue: unknown;
  }> {
    const oldRecord = this.asChangeLogRecord(oldPayload);
    const newRecord = this.asChangeLogRecord(newPayload);
    const propertyNames =
      action === 'delete'
        ? new Set(Object.keys(oldRecord))
        : new Set(Object.keys(newRecord));
    const details: Array<{
      property: string;
      oldValue: unknown;
      newValue: unknown;
    }> = [];

    [...propertyNames]
      .sort((left, right) => left.localeCompare(right))
      .forEach((property) => {
        if (CHANGE_LOG_DETAIL_IGNORED_FIELDS.has(property)) {
          return;
        }

        const oldValue = this.normalizeChangeLogValue(oldRecord[property]);
        const newValue = this.normalizeChangeLogValue(newRecord[property]);

        if (this.areChangeLogValuesEqual(oldValue, newValue)) {
          return;
        }

        details.push({
          property,
          oldValue,
          newValue,
        });
      });

    return details;
  }

  private areChangeLogValuesEqual(left: unknown, right: unknown): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  private areUpdateConflictValuesEqual(
    left: unknown,
    right: unknown,
  ): boolean {
    return (
      JSON.stringify(this.normalizeUpdateConflictValue(left)) ===
      JSON.stringify(this.normalizeUpdateConflictValue(right))
    );
  }

  private normalizeUpdateConflictValue(
    value: unknown,
    visited = new WeakMap<object, unknown>(),
  ): unknown {
    if (value == null) {
      return null;
    }

    if (typeof value === 'string') {
      return value.trim().length === 0 ? null : value;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map((entry) =>
        this.normalizeUpdateConflictValue(entry, visited),
      );
    }

    if (typeof value !== 'object') {
      return value;
    }

    const cached = visited.get(value);
    if (typeof cached !== 'undefined') {
      return cached;
    }

    const normalizedRecord: Record<string, unknown> = {};
    visited.set(value, normalizedRecord);

    Object.keys(value)
      .sort((leftKey, rightKey) => leftKey.localeCompare(rightKey))
      .forEach((key) => {
        normalizedRecord[key] = this.normalizeUpdateConflictValue(
          (value as Record<string, unknown>)[key],
          visited,
        );
      });

    return normalizedRecord;
  }

  private extractChangeLogReference(
    payload: ChangeLogPayload | object,
  ): string | number | null {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return null;
    }

    const handle = (payload as Record<string, unknown>).handle;
    return typeof handle === 'string' || typeof handle === 'number'
      ? handle
      : null;
  }

  private asChangeLogRecord(
    payload: ChangeLogPayload,
  ): Record<string, unknown> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return {};
    }

    return payload;
  }

  private normalizeChangeLogPayload(
    payload: Record<string, unknown> | null | undefined,
  ): ChangeLogPayload {
    if (!payload) {
      return null;
    }

    const normalized = this.normalizeChangeLogValue(payload);
    return normalized &&
      typeof normalized === 'object' &&
      !Array.isArray(normalized)
      ? (normalized as Record<string, unknown>)
      : null;
  }

  private captureEntityChangeLogPayload(
    entityHandle: string,
    value: object,
    template: EntityTemplateDto[],
    shapeSource?: ChangeLogPayload,
  ): ChangeLogPayload {
    const sanitized = this.normalizeChangeLogPayload(
      this.genericSanitizerService.sanitizeEntityResult(
        entityHandle,
        value,
        template,
      ) as Record<string, unknown>,
    );

    return this.projectChangeLogPayload(template, sanitized, shapeSource);
  }

  private captureSubmittedChangeLogPayload(
    template: EntityTemplateDto[],
    payload: Record<string, unknown> | null | undefined,
  ): ChangeLogPayload {
    if (!payload) {
      return null;
    }

    const normalized = this.normalizeChangeLogPayload({
      ...payload,
    });

    return this.projectChangeLogPayload(template, normalized);
  }

  private projectChangeLogPayload(
    template: EntityTemplateDto[],
    payload: ChangeLogPayload,
    shapeSource?: ChangeLogPayload,
  ): ChangeLogPayload {
    if (!payload) {
      return null;
    }

    const templateFieldMap = new Map(
      template.map((field) => [field.name, field]),
    );
    const sourceRecord = this.asChangeLogRecord(payload);
    const shapeRecord = this.asChangeLogRecord(shapeSource ?? null);
    const keys =
      shapeSource == null
        ? Object.keys(sourceRecord)
        : Object.keys(shapeRecord);
    const projected: Record<string, unknown> = {};

    keys.forEach((key) => {
      const field = templateFieldMap.get(key);
      const sourceValue = sourceRecord[key];

      if (field?.options?.includes('isSecurity')) {
        projected[key] =
          shapeSource == null
            ? (sourceValue ?? null)
            : Object.prototype.hasOwnProperty.call(shapeRecord, key)
              ? shapeRecord[key]
              : null;
        return;
      }

      projected[key] = this.projectChangeLogFieldValue(field, sourceValue);
    });

    return projected;
  }

  private projectChangeLogFieldValue(
    field: EntityTemplateDto | undefined,
    value: unknown,
  ): unknown {
    if (value == null || !field?.isReference) {
      return value ?? null;
    }

    if (Array.isArray(value)) {
      return value.map((entry) =>
        this.projectChangeLogReferenceValue(field, entry),
      );
    }

    return this.projectChangeLogReferenceValue(field, value);
  }

  private projectChangeLogReferenceValue(
    field: EntityTemplateDto,
    value: unknown,
  ): unknown {
    if (value == null) {
      return null;
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
      return value;
    }

    if (field.referencedPks.length <= 1) {
      const pk = field.referencedPks[0] ?? 'handle';
      return this.normalizeChangeLogValue(
        (value as Record<string, unknown>)[pk],
      );
    }

    return Object.fromEntries(
      field.referencedPks.map((pk) => [
        pk,
        this.normalizeChangeLogValue((value as Record<string, unknown>)[pk]),
      ]),
    );
  }

  private normalizeChangeLogValue(
    value: unknown,
    visited = new WeakMap<object, unknown>(),
  ): unknown {
    if (value == null) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map((entry) => this.normalizeChangeLogValue(entry, visited));
    }

    if (typeof value !== 'object') {
      return value;
    }

    const cached = visited.get(value);
    if (typeof cached !== 'undefined') {
      return cached;
    }

    const normalizedRecord: Record<string, unknown> = {};
    visited.set(value, normalizedRecord);

    Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .forEach((key) => {
        normalizedRecord[key] = this.normalizeChangeLogValue(
          (value as Record<string, unknown>)[key],
          visited,
        );
      });

    return normalizedRecord;
  }
  // #endregion
}
