import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager, RequiredEntityData } from '@mikro-orm/core';
import { TemplateService } from '../template/template.service';
import { EntityItem } from '../../entity/EntityItem';
import { PersonItem } from '../../entity/PersonItem';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';
import { performance } from 'perf_hooks';
import { ScriptResultServerMethods } from '../../script/core/script.result.server';
import { ScriptService, ScriptMethods } from '../script/script.service';
import type { ScriptServerContext } from '../../script/core/script.interface';
import { TimelineResponseDto } from './dto/timeline-response.dto';
import { GenericPermissionService } from './generic-permission.service';
import { GenericQueryService } from './generic-query.service';
import { GenericReferenceService } from './generic-reference.service';
import { GenericSanitizerService } from './generic-sanitizer.service';
import {
  GenericTimelineService,
  TimelineDateFieldConfig,
  TimelineDescriptorDataset,
  TimelineRecordResult,
  TimelineRelationDescriptor,
} from './generic-timeline.service';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Service for generic CRUD operations on entities. Handles business logic, security, and scripting for entity manipulation.
 *
 * @property        {EntityManager} em              MikroORM entity manager for database operations
 * @property        {TemplateService} templateService Service for entity templates
 * @property        {ScriptService} scriptService   Service for script execution
 * @property        {GenericQueryService} genericQueryService Service for query normalization and relation population
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
 * @method          filterNonStringLike Filters out $like/$or on non-string fields
 * @method          convertDateStrings Converts date strings in filters to Date objects
 */
@Injectable()
export class GenericService {
  // #region Constructor
  /**
   * Service constructor with dependency injection.
   * @param {EntityManager} em MikroORM entity manager
   * @param {TemplateService} templateService Service for entity templates
   * @param {ScriptService} scriptService Service for script execution
   * @param {GenericQueryService} genericQueryService Service for query normalization and relation population
   * @param {GenericPermissionService} genericPermissionService Service for permission checks and security filters
   * @param {GenericReferenceService} genericReferenceService Service for relation handling and reference dependency validation
   * @param {GenericSanitizerService} genericSanitizerService Service for sanitizing entity graphs and security fields
   * @param {GenericTimelineService} genericTimelineService Service for timeline descriptors, windows, and summary composition
   */
  constructor(
    private readonly em: EntityManager,
    private readonly templateService: TemplateService,
    private readonly scriptService: ScriptService,
    private readonly genericQueryService: GenericQueryService,
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
    const entity = await this.em.findOne(EntityItem, { handle: entityHandle });
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
    let result: [object[], number];

    if (entity) {
      // Run script before read
      const script = await this.scriptService.runServer(
        ScriptMethods.beforeRead,
        where,
        entity,
        currentUser,
      );
      where = script.items;
    }

    // Filter: $ilike nur auf String-Felder anwenden
    const stringFields = template
      ? template
          .filter((f) => f.type === 'string')
          .map((f) => f.name)
          .filter((name): name is string => typeof name === 'string')
      : [];

    where = this.filterNonStringLike(
      this.genericPermissionService.setTopLevelFilter(
        where,
        currentUser,
        entityHandle,
      ),
      stringFields,
    );

    // Datumsstrings im where-Filter zu Date-Objekten konvertieren
    where = this.convertDateStrings(where, template);
    try {
      result = await this.em.findAndCount(entityClass, where, {
        limit,
        offset,
        orderBy,
        populate: populate as any[],
      });
    } catch (error) {
      global.log.error(`entity ${entityHandle}:`, error);
      if (error instanceof Error) {
        throw new BadRequestException(
          `global.${error.name.charAt(0).toLowerCase() + error.name.slice(1)}`,
          error.message,
        );
      }
      throw error;
    }

    let items = result[0];
    const total = result[1];

    if (page == null) {
      limit = total;
      page = 1;
    }

    if (entity) {
      // Run script after read
      const script = await this.scriptService.runServer(
        ScriptMethods.afterRead,
        items,
        entity,
        currentUser,
      );
      items = script.items;
    }

    items = this.genericSanitizerService.sanitizeEntityResult(entityHandle, items, template);

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
    let result: object[];

    // Security filter
    const stringFields = template
      ? template
          .filter((f) => f.type === 'string')
          .map((f) => f.name)
          .filter((name): name is string => typeof name === 'string')
      : [];

    where = this.filterNonStringLike(
      this.genericPermissionService.setTopLevelFilter(
        where,
        currentUser,
        entityHandle,
      ),
      stringFields,
    );

    where = this.convertDateStrings(where, template);

    try {
      result = await this.em.find(entityClass, where, {
        orderBy,
        populate: populate as any[],
      });
    } catch (error) {
      global.log.error(`entity ${entityHandle}:`, error);
      if (error instanceof Error) {
        throw new BadRequestException(
          `global.${error.name.charAt(0).toLowerCase() + error.name.slice(1)}`,
          error.message,
        );
      }
      throw error;
    }

    // Convert to JSON
    return JSON.stringify(result, null, 2);
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
    const lowerBound = this.genericTimelineService.getTimelineLowerBound(
      datasets,
    );

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

    if (template) {
      data = this.genericReferenceService.reduceReferenceFields(template, data);

      for (const field of template) {
        // Remove auto-increment / isReadOnly fields
        if (field.isAutoIncrement || field.options?.includes('isReadOnly')) {
          if (typeof field.name !== 'undefined') {
            delete (data as Record<string, any>)[field.name];
          }
        }
      }
    }

    if (entity) {
      // Run script before insert
      const script = await this.scriptService.runServer(
        ScriptMethods.beforeInsert,
        data,
        entity,
        currentUser,
        scriptContext,
      );
      switch (script.method) {
        case ScriptResultServerMethods.overwrite:
          data = script.items[0];
          break;
      }
    }

    await this.genericReferenceService.validateReferenceDependencies(
      entityHandle,
      data,
      template,
      currentUser,
    );

    const entityClass = this.genericQueryService.getEntityClass(entityHandle);

    try {
      data = this.normalizeDatePayload(data, template);
      newData = this.em.create(entityClass, data as RequiredEntityData<object>);
      await this.em.flush();
    } catch (error) {
      global.log.error(`entity ${entityHandle}:`, error);
      if (error instanceof Error) {
        throw new BadRequestException(
          `global.${error.name.charAt(0).toLowerCase() + error.name.slice(1)}`,
          error.message,
        );
      }
      throw error;
    }

    if (entity) {
      // Run script after insert
      const script = await this.scriptService.runServer(
        ScriptMethods.afterInsert,
        newData,
        entity,
        currentUser,
      );

      switch (script.method) {
        case ScriptResultServerMethods.overwrite:
          newData = script.items[0];
          newData = this.normalizeDatePayload(newData, template);
          newData = this.em.assign(newData, newData);
          await this.em.flush();
          break;
      }
    }
    return this.genericSanitizerService.sanitizeEntityResult(entityHandle, newData, template);
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
    const populate = this.genericQueryService.buildPopulate(relations, template);
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

    if (template) {
      data = this.genericReferenceService.reduceReferenceFields(template, data);

      for (const field of template) {
        // Remove isReadOnly fields
        if (field.options?.includes('isReadOnly')) {
          if (typeof field.name !== 'undefined') {
            delete (data as Record<string, any>)[field.name];
          }
        }
      }
    }

    if (entity) {
      // Run script before update
      const script = await this.scriptService.runServer(
        ScriptMethods.beforeUpdate,
        data,
        entity,
        currentUser,
        { currentItems: [item] },
      );
      switch (script.method) {
        case ScriptResultServerMethods.overwrite:
          data = script.items[0];
          break;
      }
    }

    await this.genericReferenceService.validateReferenceDependencies(
      entityHandle,
      {
        ...(item as Record<string, unknown>),
        ...(data as Record<string, unknown>),
      },
      template,
      currentUser,
    );

    try {
      data = this.normalizeDatePayload(data, template);
      newData = this.em.assign(item, data);
      await this.em.flush();
    } catch (error) {
      global.log.error(`entity ${entityHandle}:`, error);
      if (error instanceof Error) {
        throw new BadRequestException(
          `global.${error.name.charAt(0).toLowerCase() + error.name.slice(1)}`,
          error.message,
        );
      }
      throw error;
    }

    if (entity && newData) {
      // Run script after update
      const script = await this.scriptService.runServer(
        ScriptMethods.afterUpdate,
        newData,
        entity,
        currentUser,
      );

      switch (script.method) {
        case ScriptResultServerMethods.overwrite:
          newData = script.items[0];
          newData = this.normalizeDatePayload(newData, template);
          newData = this.em.assign(item, newData);
          await this.em.flush();
          break;
      }
    }
    return this.genericSanitizerService.sanitizeEntityResult(entityHandle, newData, template);
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

    if (entity) {
      // Run script before delete
      const script = await this.scriptService.runServer(
        ScriptMethods.beforeDelete,
        item,
        entity,
        currentUser,
      );
      switch (script.method) {
        case ScriptResultServerMethods.overwrite:
          item = script.items[0];
          break;
      }
    }

    let affectedRows: number;

    try {
      affectedRows = await this.em.nativeDelete(entityClass, handleFilter);
    } catch (error) {
      global.log.error(`entity ${entityHandle}:`, error);
      if (error instanceof Error) {
        throw new BadRequestException(
          `global.${error.name.charAt(0).toLowerCase() + error.name.slice(1)}`,
          error.message,
        );
      }
      throw error;
    }

    if (affectedRows === 0) {
      throw new NotFoundException(`global.entityNotFound`);
    }

    if (entity) {
      // Run script after delete
      await this.scriptService.runServer(
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
    const entityClass = this.genericQueryService.getEntityClass(entityHandle);
    const template = this.templateService.getEntityTemplate(entityHandle);
    const name = template.find((x) => x.name == referenceName);
    const item = await this.em.findOne(
      entityClass,
      this.genericReferenceService.getHandleFilter(
        entityHandle,
        entityHandleValue,
      ),
    );

    if (!item || !name) {
      throw new NotFoundException(`global.entityNotFound`);
    }

    this.genericPermissionService.checkTopLevelPermission(
      entityHandle,
      item,
      currentUser,
      'allowUpdateStage',
    );

    const referenceEntityHandle = name.referenceName;
    const referenceClass = this.genericQueryService.getEntityClass(
      referenceEntityHandle,
    );
    const referenceHandle = this.genericReferenceService.normalizeHandleValue(
      referenceEntityHandle,
      referenceHandleValue,
    );
    const referenceFilter = this.genericPermissionService.setTopLevelFilter(
      this.genericReferenceService.getHandleFilter(
        referenceEntityHandle,
        referenceHandle,
      ),
      currentUser,
      referenceEntityHandle,
    );
    const ref = await this.em.findOne(referenceClass, referenceFilter);

    if (!ref) {
      throw new NotFoundException(`global.referenceNotFound`);
    }

    const relation = this.genericReferenceService.getRelationCollection(
      item,
      name.name,
    );

    await relation.init({
      where: this.genericReferenceService.getHandleFilter(
        referenceEntityHandle,
        referenceHandle,
      ),
    });
    relation.add(ref);

    await this.em.flush();
    return this.genericSanitizerService.sanitizeEntityResult(entityHandle, item, template);
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
    const entityClass = this.genericQueryService.getEntityClass(entityHandle);
    const template = this.templateService.getEntityTemplate(entityHandle);
    const name = template.find((x) => x.name == referenceName);
    const item = await this.em.findOne(
      entityClass,
      this.genericReferenceService.getHandleFilter(
        entityHandle,
        entityHandleValue,
      ),
    );

    if (!item || !name) {
      throw new NotFoundException(`global.entityNotFound`);
    }

    this.genericPermissionService.checkTopLevelPermission(
      entityHandle,
      item,
      currentUser,
      'allowUpdateStage',
    );

    const referenceEntityHandle = name.referenceName;
    const referenceClass = this.genericQueryService.getEntityClass(
      referenceEntityHandle,
    );
    const referenceHandle = this.genericReferenceService.normalizeHandleValue(
      referenceEntityHandle,
      referenceHandleValue,
    );
    const referenceFilter = this.genericPermissionService.setTopLevelFilter(
      this.genericReferenceService.getHandleFilter(
        referenceEntityHandle,
        referenceHandle,
      ),
      currentUser,
      referenceEntityHandle,
    );
    const ref = await this.em.findOne(referenceClass, referenceFilter);

    if (!ref) {
      throw new NotFoundException(`global.referenceNotFound`);
    }

    const relation = this.genericReferenceService.getRelationCollection(
      item,
      name.name,
    );

    await relation.init({
      where: this.genericReferenceService.getHandleFilter(
        referenceEntityHandle,
        referenceHandle,
      ),
    });
    relation.remove(ref);
    await this.em.flush();
    return this.genericSanitizerService.sanitizeEntityResult(entityHandle, item, template);
  }
  // #endregion

  private async findTimelineRecord(
    entityHandle: string,
    where: object,
    template: EntityTemplateDto[],
    currentUser: PersonItem,
  ): Promise<Record<string, unknown> | null> {
    const preparedWhere = await this.prepareTimelineWhere(
      entityHandle,
      where,
      template,
      currentUser,
    );
    const entityClass = this.genericQueryService.getEntityClass(entityHandle);
    const populate = this.genericQueryService.buildPopulate(
      ['m:1'],
      template,
    );
    const record = await this.em.findOne(entityClass, preparedWhere, {
      populate: populate as any[],
    });

    if (!record) {
      return null;
    }

    return this.genericSanitizerService.sanitizeEntityResult(entityHandle, record, template);
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
        const relationFilter = this.genericTimelineService.buildTimelineReverseFilter(
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
    const preparedWhere = await this.prepareTimelineWhere(
      entityHandle,
      where,
      template,
      currentUser,
    );
    const entityClass =
      this.genericQueryService.getEntityClass<TimelineRecordResult>(
        entityHandle,
      );
    const populate = this.genericQueryService.buildPopulate(
      ['m:1'],
      template,
    );
    const records = await this.em.find(entityClass, preparedWhere, {
      populate,
      orderBy: { updatedAt: 'DESC', createdAt: 'DESC' },
    });

    return this.genericSanitizerService.sanitizeEntityResult(entityHandle, records, template);
  }

  private async prepareTimelineWhere(
    entityHandle: string,
    where: object,
    template: EntityTemplateDto[],
    currentUser: PersonItem,
  ): Promise<object> {
    const entity = await this.em.findOne(EntityItem, { handle: entityHandle });
    let nextWhere = where;

    if (entity) {
      const script = await this.scriptService.runServer(
        ScriptMethods.beforeRead,
        nextWhere,
        entity,
        currentUser,
      );
      nextWhere = script.items;
    }

    const stringFields = template
      .filter((field) => field.type === 'string')
      .map((field) => field.name)
      .filter((name): name is string => typeof name === 'string');

    nextWhere = this.filterNonStringLike(
      this.genericPermissionService.setTopLevelFilter(
        nextWhere,
        currentUser,
        entityHandle,
      ),
      stringFields,
    );

    return this.convertDateStrings(nextWhere, template);
  }

  /**
   * Validates string filter operators for PostgreSQL queries.
   * @param {object} obj Filter object
   * @param {string[]} stringFields List of string field names
   * @returns {object} Filtered object
   */
  private filterNonStringLike<T>(obj: T, stringFields: string[]): T {
    this.normalizeLikeOperators(obj);

    if (Array.isArray(obj)) {
      (obj as unknown[]).forEach((item) => {
        this.filterNonStringLike(item, stringFields);
      });
      return obj;
    }

    if (typeof obj === 'object' && obj !== null) {
      const record = obj as Record<string, unknown>;

      for (const logicalOperator of ['$or', '$and']) {
        if (logicalOperator in record) {
          const logicalValue = record[logicalOperator];

          if (!Array.isArray(logicalValue) || logicalValue.length === 0) {
            throw new BadRequestException(
              'exception.badRequest',
              `${logicalOperator} must be a non-empty array`,
            );
          }

          logicalValue.forEach((condition: object) => {
            this.filterNonStringLike(condition, stringFields);
          });
        }
      }

      for (const key of Object.keys(record)) {
        const value = record[key];

        if (
          typeof value === 'object' &&
          value !== null &&
          '$ilike' in value &&
          !stringFields.includes(key)
        ) {
          throw new BadRequestException(
            'exception.badRequest',
            `$ilike is only allowed on string fields`,
          );
        }
      }
    }

    return obj;
  }

  private normalizeLikeOperators(obj: unknown): void {
    if (Array.isArray(obj)) {
      obj.forEach((item) => this.normalizeLikeOperators(item));
      return;
    }

    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    const record = obj as Record<string, unknown>;

    for (const [key, value] of Object.entries(record)) {
      if (key === '$like') {
        record.$ilike = value;
        delete record.$like;
        continue;
      }

      this.normalizeLikeOperators(value);
    }
  }

  private isPlainRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  /**
   * Converts date filter values in the where filter to Date objects.
   * Supports ISO/date strings and numeric epoch timestamps for PostgreSQL-safe comparisons.
   * @param {T} obj Filter object
   * @returns {T} Object with date values converted to Date objects
   */
  private convertDateStrings<T>(obj: T, template: EntityTemplateDto[] = []): T {
    if (Array.isArray(obj)) {
      return (obj as unknown[]).map((item) =>
        this.isPlainRecord(item)
          ? this.convertDateStrings(item, template)
          : item,
      ) as T;
    }

    if (!this.isPlainRecord(obj)) {
      return obj;
    }

    const dateFields = new Set(
      template
        .filter((field) =>
          ['date', 'datetime', 'DateType'].includes(field.type),
        )
        .map((field) => field.name),
    );

    const record = obj as Record<string, unknown>;

    for (const key of Object.keys(record)) {
      const isDateField = dateFields.has(key);
      const normalizedValue = isDateField
        ? this.normalizeDateFilterValue(record[key])
        : null;

      if (normalizedValue) {
        record[key] = normalizedValue;
      } else if (this.isPlainRecord(record[key])) {
        const operatorRecord = record[key];

        // For operators like $gte, $lte
        for (const op of ['$gte', '$lte', '$gt', '$lt', '$eq']) {
          if (!isDateField || typeof operatorRecord[op] === 'undefined') {
            continue;
          }

          const normalizedOperatorValue = this.normalizeDateFilterValue(
            operatorRecord[op],
          );

          if (normalizedOperatorValue) {
            operatorRecord[op] = normalizedOperatorValue;
          }
        }

        record[key] = this.convertDateStrings(operatorRecord, template);
      }
    }
    return obj;
  }

  private normalizeDateFilterValue(value: unknown): Date | null {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    if (typeof value !== 'string') {
      return null;
    }

    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return null;
    }

    if (/^\d+$/.test(trimmedValue)) {
      const timestamp = Number(trimmedValue);
      if (!Number.isFinite(timestamp)) {
        return null;
      }

      const date = new Date(timestamp);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    if (
      /^\d{4}-\d{2}-\d{2}$/.test(trimmedValue) ||
      !Number.isNaN(Date.parse(trimmedValue))
    ) {
      const date = new Date(trimmedValue);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    return null;
  }

  private normalizeDatePayload(
    data: Record<string, any>,
    template: EntityTemplateDto[] = [],
  ): Record<string, any> {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const dateFields = new Set(
      template
        .filter((field) =>
          ['date', 'datetime', 'DateType'].includes(field.type),
        )
        .map((field) => field.name)
        .filter((name): name is string => typeof name === 'string'),
    );

    for (const key of Object.keys(data)) {
      if (!dateFields.has(key)) {
        continue;
      }

      const normalizedValue = this.normalizeDatePayloadValue(data[key]);
      if (typeof normalizedValue !== 'undefined') {
        data[key] = normalizedValue;
      }
    }

    return data;
  }

  private normalizeDatePayloadValue(value: unknown): Date | null | undefined {
    if (value === null) {
      return null;
    }

    if (typeof value === 'string' && !value.trim()) {
      return null;
    }

    const normalizedValue = this.normalizeDateFilterValue(value);
    if (normalizedValue) {
      return normalizedValue;
    }

    return undefined;
  }
  // #endregion
}
