import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { TemplateService } from '../template/template.service';
import { EntityItem } from '../../entity/EntityItem';
import { PersonItem } from '../../entity/PersonItem';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';
import { performance } from 'perf_hooks';
import { ScriptMethods } from '../script/script.service';
import type { ScriptServerContext } from '../../script/core/script.interface';
import { TimelineResponseDto } from './dto/timeline-response.dto';
import { GenericMutationService } from './generic-mutation.service';
import { GenericPayloadService } from './generic-payload.service';
import { GenericPermissionService } from './generic-permission.service';
import { GenericQueryService } from './generic-query.service';
import { GenericReadService } from './generic-read.service';
import { GenericRelationService } from './generic-relation.service';
import { GenericReferenceService } from './generic-reference.service';
import { GenericSanitizerService } from './generic-sanitizer.service';
import {
  GenericTimelineService,
  TimelineDescriptorDataset,
  TimelineRecordResult,
  TimelineRelationDescriptor,
} from './generic-timeline.service';
import { GENERIC_DOWNLOAD_LIMIT } from '../../constants/project.constants';

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
  ): Promise<object> {
    this.genericPermissionService.checkTopLevelPermission(
      entityHandle,
      data,
      currentUser,
      'allowInsertStage',
    );

    const template = this.templateService.getEntityTemplate(entityHandle);
    const entity = await this.em.findOne(EntityItem, { handle: entityHandle });
    let newData: object;
    const scriptContext: ScriptServerContext = {};

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
  ): Promise<object> {
    const entityClass = this.genericQueryService.getEntityClass(entityHandle);
    const entity = await this.em.findOne(EntityItem, { handle: entityHandle });
    const template = this.templateService.getEntityTemplate(entityHandle);
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

    this.genericPermissionService.checkTopLevelPermission(
      entityHandle,
      { ...item, ...data },
      currentUser,
      'allowUpdateStage',
    );

    data = this.genericPayloadService.prepareUpdatePayload(template, data);

    data = await this.genericMutationService.applyBeforeScript(
      ScriptMethods.beforeUpdate,
      data,
      entity,
      currentUser,
      { currentItems: [item] },
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
  ): Promise<void> {
    const entityClass = this.genericQueryService.getEntityClass(entityHandle);
    const handleFilter = this.genericReferenceService.getHandleFilter(
      entityHandle,
      handle,
    );
    let item = await this.em.findOne(entityClass, handleFilter);
    const entity = await this.em.findOne(EntityItem, { handle: entityHandle });

    if (!item) {
      throw new NotFoundException(`global.entityNotFound`);
    }

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
      );
    }
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
  ): Promise<object> {
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
  ): Promise<object> {
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

    return this.genericSanitizerService.sanitizeEntityResult(
      entityHandle,
      newData,
      mutation.template,
    );
  }
  // #endregion

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
  // #endregion
}
