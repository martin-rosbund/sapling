import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { EntityManager, RequiredEntityData, EntityName } from '@mikro-orm/core';
import {
  ENTITY_MAP,
  ENTITY_REGISTRY,
} from '../../entity/global/entity.registry';
import { hasSaplingOption } from '../../entity/global/entity.decorator';
import { TemplateService } from '../template/template.service';
import { EntityItem } from '../../entity/EntityItem';
import { PersonItem } from '../../entity/PersonItem';
import { CurrentService } from '../current/current.service';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';
import { performance } from 'perf_hooks';
import { ScriptResultServerMethods } from '../../script/core/script.result.server';
import { ScriptService, ScriptMethods } from '../script/script.service';
import {
  TimelineEntitySummaryDto,
  TimelineMonthDto,
  TimelineRecordAnchorDto,
  TimelineResponseDto,
  TimelineSummaryGroupDto,
  TimelineSummaryGroupItemDto,
} from './dto/timeline-response.dto';
import { TicketSearchIndexService } from '../ai/ticket-search-index.service';

// #region Entity Map
const entityMap = ENTITY_MAP;
// #endregion

type TimelineRelationDescriptor = {
  entityHandle: string;
  template: EntityTemplateDto[];
  relationFields: EntityTemplateDto[];
  relationCategory: string | null;
  dateFields: TimelineDateFieldConfig;
  chipFields: EntityTemplateDto[];
  booleanFields: EntityTemplateDto[];
  moneyField: EntityTemplateDto | null;
};

type TimelineDescriptorDataset = {
  descriptor: TimelineRelationDescriptor;
  relationFilter: object;
  records: Record<string, unknown>[];
};

type TimelineDateFieldConfig = {
  startFieldName: string;
  endFieldName: string;
  startFallbackFieldName: 'createdAt';
  endFallbackFieldName: 'updatedAt';
};

type TimelineDateSpan = {
  start: Date | null;
  end: Date | null;
};

type TimelineMonthWindow = {
  key: string;
  label: string;
  start: Date;
  end: Date;
};

type TimelineGroupIdentity = {
  key: string;
  label: string;
  color?: string | null;
  icon?: string | null;
  rawValue: string | number | boolean | null;
};

type TimelineRecordResult = Record<string, unknown> & {
  updatedAt?: Date;
  createdAt?: Date;
};

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Service for generic CRUD operations on entities. Handles business logic, security, and scripting for entity manipulation.
 *
 * @property        {EntityManager} em              MikroORM entity manager for database operations
 * @property        {TemplateService} templateService Service for entity templates
 * @property        {CurrentService} currentService Service for current user/session context
 * @property        {ScriptService} scriptService   Service for script execution
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
   * @param {CurrentService} currentService Service for current user/session context
   * @param {ScriptService} scriptService Service for script execution
   */
  constructor(
    private readonly em: EntityManager,
    private readonly templateService: TemplateService,
    private readonly currentService: CurrentService,
    private readonly scriptService: ScriptService,
    @Optional()
    private readonly ticketSearchIndexService?: TicketSearchIndexService,
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
    const entityClass = this.getEntityClass(entityHandle);
    const offset = (page - 1) * limit;
    const template = this.templateService.getEntityTemplate(entityHandle);
    const entity = await this.em.findOne(EntityItem, { handle: entityHandle });
    where = this.normalizeQueryCriteria(entityHandle, where, 'filter');
    orderBy = this.normalizeQueryCriteria(entityHandle, orderBy, 'orderBy');
    const populate = this.buildPopulate(
      [
        ...relations,
        ...this.collectQueryPopulateRelations(entityHandle, where),
        ...this.collectQueryPopulateRelations(entityHandle, orderBy),
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
      this.setTopLevelFilter(where, currentUser, entityHandle),
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

    // Felder mit isSecurity=true aus den Items entfernen
    items = this.removeSecurityFields(entityHandle, template, items);

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
    items = this.removeSecurityFields(entityHandle, template, items);
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
    const entityClass = this.getEntityClass(entityHandle);
    const template = this.templateService.getEntityTemplate(entityHandle);
    where = this.normalizeQueryCriteria(entityHandle, where, 'filter');
    orderBy = this.normalizeQueryCriteria(entityHandle, orderBy, 'orderBy');
    const populate = this.buildPopulate(
      [
        ...relations,
        ...this.collectQueryPopulateRelations(entityHandle, where),
        ...this.collectQueryPopulateRelations(entityHandle, orderBy),
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
      this.setTopLevelFilter(where, currentUser, entityHandle),
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

    // Remove security fields
    result = this.removeSecurityFields(entityHandle, template, result);

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
    const normalizedHandle = this.normalizeHandleValue(entityHandle, handle);
    const normalizedMonths = Number.isFinite(months)
      ? Math.max(1, Math.min(12, Number(months)))
      : 6;
    const mainTemplate = this.templateService.getEntityTemplate(entityHandle);
    const mainDateFields = this.getTimelineDateFieldConfig(mainTemplate);
    const mainRecord = await this.findTimelineRecord(
      entityHandle,
      this.getHandleFilter(entityHandle, normalizedHandle),
      mainTemplate,
      currentUser,
    );

    if (!mainRecord) {
      throw new NotFoundException('global.notFound');
    }

    const anchor = this.buildTimelineAnchor(
      entityHandle,
      normalizedHandle,
      mainRecord,
      mainTemplate,
      mainDateFields,
    );
    const cursorMonth =
      this.parseTimelineCursor(before) ?? this.addMonths(new Date(), 1);
    const relationDescriptors = this.getTimelineRelationDescriptors(
      entityHandle,
      currentUser,
    );
    const datasets = await this.loadTimelineDescriptorDatasets(
      relationDescriptors,
      normalizedHandle,
      currentUser,
      cursorMonth,
    );
    const lowerBound = this.getTimelineLowerBound(datasets);

    const response = new TimelineResponseDto();
    response.entityHandle = entityHandle;
    response.handle = normalizedHandle;
    response.anchor = anchor;

    if (!lowerBound) {
      response.hasMore = false;
      response.nextBefore = null;
      return response;
    }

    let currentMonth = this.getMonthStart(cursorMonth);

    while (
      response.months.length < normalizedMonths &&
      currentMonth.getTime() >= lowerBound.getTime()
    ) {
      const monthWindow = this.createTimelineMonthWindow(currentMonth);
      const month = this.buildTimelineMonth(datasets, monthWindow);
      response.months.push(month);

      currentMonth = this.addMonths(currentMonth, -1);
    }

    response.hasMore = currentMonth.getTime() >= lowerBound.getTime();
    response.nextBefore = response.hasMore
      ? this.formatTimelineCursor(currentMonth)
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
    this.checkTopLevelPermission(
      entityHandle,
      data,
      currentUser,
      'allowInsertStage',
    );

    const template = this.templateService.getEntityTemplate(entityHandle);
    const entity = await this.em.findOne(EntityItem, { handle: entityHandle });
    let newData: object;

    if (template) {
      data = this.reduceReferenceFields(template, data);

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
      );
      switch (script.method) {
        case ScriptResultServerMethods.overwrite:
          data = script.items[0];
          break;
      }
    }

    await this.validateReferenceDependencies(
      entityHandle,
      data,
      template,
      currentUser,
    );

    const entityClass = this.getEntityClass(entityHandle);

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

    await this.upsertTicketSearchDocument(entityHandle, newData);

    return this.sanitizeEntityResult(entityHandle, newData, template);
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
    const entityClass = this.getEntityClass(entityHandle);
    const entity = await this.em.findOne(EntityItem, { handle: entityHandle });
    const template = this.templateService.getEntityTemplate(entityHandle);
    const populate = this.buildPopulate(relations, template);
    let newData: object;

    const handleFilter = this.getHandleFilter(entityHandle, handle);
    const item = await this.em.findOne(entityClass, handleFilter, {
      populate: populate as any[],
    });

    if (!item) {
      throw new NotFoundException(`global.entityNotFound`);
    }

    this.checkTopLevelPermission(
      entityHandle,
      { ...item, ...data },
      currentUser,
      'allowUpdateStage',
    );

    if (template) {
      data = this.reduceReferenceFields(template, data);

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
      );
      switch (script.method) {
        case ScriptResultServerMethods.overwrite:
          data = script.items[0];
          break;
      }
    }

    await this.validateReferenceDependencies(
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

    await this.upsertTicketSearchDocument(entityHandle, newData);

    return this.sanitizeEntityResult(entityHandle, newData, template);
  }

  private async upsertTicketSearchDocument(
    entityHandle: string,
    record: unknown,
  ): Promise<void> {
    if (entityHandle !== 'ticket' || !record || !this.ticketSearchIndexService) {
      return;
    }

    await this.ticketSearchIndexService.upsertTicket(record as never);
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
    const entityClass = this.getEntityClass(entityHandle);
    const handleFilter = this.getHandleFilter(entityHandle, handle);
    let item = await this.em.findOne(entityClass, handleFilter);
    const entity = await this.em.findOne(EntityItem, { handle: entityHandle });
    const template = this.templateService.getEntityTemplate(entityHandle);

    if (!item) {
      throw new NotFoundException(`global.entityNotFound`);
    }

    this.checkTopLevelPermission(
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
    const entityClass = this.getEntityClass(entityHandle);
    const template = this.templateService.getEntityTemplate(entityHandle);
    const name = template.find((x) => x.name == referenceName);
    const item = await this.em.findOne(
      entityClass,
      this.getHandleFilter(entityHandle, entityHandleValue),
    );

    if (!item || !name) {
      throw new NotFoundException(`global.entityNotFound`);
    }

    this.checkTopLevelPermission(
      entityHandle,
      item,
      currentUser,
      'allowUpdateStage',
    );

    const referenceEntityHandle = name.referenceName;
    const referenceClass = this.getEntityClass(referenceEntityHandle);
    const referenceHandle = this.normalizeHandleValue(
      referenceEntityHandle,
      referenceHandleValue,
    );
    const referenceFilter = this.setTopLevelFilter(
      this.getHandleFilter(referenceEntityHandle, referenceHandle),
      currentUser,
      referenceEntityHandle,
    );
    const ref = await this.em.findOne(referenceClass, referenceFilter);

    if (!ref) {
      throw new NotFoundException(`global.referenceNotFound`);
    }

    const relation = this.getRelationCollection(item, name.name);

    await relation.init({
      where: this.getHandleFilter(referenceEntityHandle, referenceHandle),
    });
    relation.add(ref);

    await this.em.flush();
    return this.sanitizeEntityResult(entityHandle, item, template);
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
    const entityClass = this.getEntityClass(entityHandle);
    const template = this.templateService.getEntityTemplate(entityHandle);
    const name = template.find((x) => x.name == referenceName);
    const item = await this.em.findOne(
      entityClass,
      this.getHandleFilter(entityHandle, entityHandleValue),
    );

    if (!item || !name) {
      throw new NotFoundException(`global.entityNotFound`);
    }

    this.checkTopLevelPermission(
      entityHandle,
      item,
      currentUser,
      'allowUpdateStage',
    );

    const referenceEntityHandle = name.referenceName;
    const referenceClass = this.getEntityClass(referenceEntityHandle);
    const referenceHandle = this.normalizeHandleValue(
      referenceEntityHandle,
      referenceHandleValue,
    );
    const referenceFilter = this.setTopLevelFilter(
      this.getHandleFilter(referenceEntityHandle, referenceHandle),
      currentUser,
      referenceEntityHandle,
    );
    const ref = await this.em.findOne(referenceClass, referenceFilter);

    if (!ref) {
      throw new NotFoundException(`global.referenceNotFound`);
    }

    const relation = this.getRelationCollection(item, name.name);

    await relation.init({
      where: this.getHandleFilter(referenceEntityHandle, referenceHandle),
    });
    relation.remove(ref);
    await this.em.flush();
    return this.sanitizeEntityResult(entityHandle, item, template);
  }
  // #endregion

  // #region Handle
  private getHandleFilter(
    entityHandle: string,
    handle: string | number,
  ): { handle: string | number } {
    return { handle: this.normalizeHandleValue(entityHandle, handle) };
  }

  private normalizeHandleValue(
    entityHandle: string,
    handle: string | number,
  ): string | number {
    const handleField = this.templateService
      .getEntityTemplate(entityHandle)
      .find((field) => field.name === 'handle');

    if (
      handleField?.type === 'number' &&
      typeof handle === 'string' &&
      handle.trim().length > 0
    ) {
      const parsedHandle = Number(handle);
      if (!Number.isNaN(parsedHandle)) {
        return parsedHandle;
      }
    }

    return handle;
  }

  private getRequiredHandle(data: object): string | number {
    const handle = (data as { handle?: string | number | null }).handle;

    if (handle == null) {
      throw new BadRequestException('global.entityNotFound');
    }

    return handle;
  }

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
    const entityClass = this.getEntityClass(entityHandle);
    const populate = this.buildPopulate(['m:1'], template);
    const record = await this.em.findOne(entityClass, preparedWhere, {
      populate: populate as any[],
    });

    if (!record) {
      return null;
    }

    return this.sanitizeEntityResult(entityHandle, record, template);
  }

  private buildTimelineAnchor(
    entityHandle: string,
    handle: string | number,
    record: Record<string, unknown>,
    template: EntityTemplateDto[],
    dateFields: TimelineDateFieldConfig,
  ): TimelineRecordAnchorDto {
    const anchor = new TimelineRecordAnchorDto();
    const span = this.getTimelineDateSpan(record, dateFields);
    anchor.entityHandle = entityHandle;
    anchor.handle = handle;
    anchor.label = this.buildTimelineRecordLabel(
      record,
      template,
      entityHandle,
    );
    anchor.startField = dateFields.startFieldName;
    anchor.endField = dateFields.endFieldName;
    anchor.startAt = span.start ? span.start.toISOString() : null;
    anchor.endAt = span.end ? span.end.toISOString() : null;
    anchor.record = record;
    return anchor;
  }

  private getTimelineRelationDescriptors(
    mainEntityHandle: string,
    currentUser: PersonItem,
  ): TimelineRelationDescriptor[] {
    return ENTITY_REGISTRY.flatMap(({ name }) => {
      if (name === mainEntityHandle) {
        return [];
      }

      const permission = this.currentService.getEntityPermissions(
        currentUser,
        name,
      );
      if (!permission.allowRead) {
        return [];
      }

      const template = this.templateService.getEntityTemplate(name);
      const candidateRelationFields = template.filter(
        (field) =>
          field.kind === 'm:1' &&
          field.referenceName === mainEntityHandle &&
          !field.options?.includes('isSecurity') &&
          !field.options?.includes('isSystem') &&
          !field.options?.includes('isHideAsReference'),
      );

      const relationFieldGroups = this.groupTimelineRelationFields(
        candidateRelationFields,
        mainEntityHandle,
      );

      if (relationFieldGroups.length === 0) {
        return [];
      }

      return relationFieldGroups.map((relationFields) => ({
        entityHandle: name,
        template,
        relationFields,
        relationCategory: this.getTimelineRelationCategory(relationFields),
        dateFields: this.getTimelineDateFieldConfig(template),
        chipFields: template.filter(
          (field) =>
            field.options?.includes('isChip') &&
            !field.options?.includes('isSecurity') &&
            !field.options?.includes('isSystem'),
        ),
        booleanFields: template.filter(
          (field) =>
            field.type === 'boolean' &&
            !field.options?.includes('isSecurity') &&
            !field.options?.includes('isSystem'),
        ),
        moneyField:
          template.find(
            (field) =>
              field.options?.includes('isMoney') &&
              !field.options?.includes('isSecurity') &&
              !field.options?.includes('isSystem'),
          ) ?? null,
      }));
    });
  }

  private buildTimelineMonth(
    datasets: TimelineDescriptorDataset[],
    monthWindow: TimelineMonthWindow,
  ): TimelineMonthDto {
    const month = new TimelineMonthDto();
    month.key = monthWindow.key;
    month.label = monthWindow.label;
    month.start = monthWindow.start.toISOString();
    month.end = monthWindow.end.toISOString();

    for (const dataset of datasets) {
      const entitySummary = this.buildTimelineEntitySummary(
        dataset,
        monthWindow,
      );

      if (entitySummary) {
        month.entities.push(entitySummary);
      }
    }

    month.entities.sort((left, right) => right.count - left.count);
    return month;
  }

  private getTimelineLowerBound(
    datasets: TimelineDescriptorDataset[],
  ): Date | null {
    let earliestDate: Date | null = null;

    for (const dataset of datasets) {
      for (const record of dataset.records) {
        const span = this.getTimelineDateSpan(
          record,
          dataset.descriptor.dateFields,
        );
        const candidateDate = span.start ?? span.end;

        if (!candidateDate) {
          continue;
        }

        if (!earliestDate || candidateDate.getTime() < earliestDate.getTime()) {
          earliestDate = candidateDate;
        }
      }
    }

    return earliestDate ? this.getMonthStart(earliestDate) : null;
  }

  private async loadTimelineDescriptorDatasets(
    descriptors: TimelineRelationDescriptor[],
    mainHandle: string | number,
    currentUser: PersonItem,
    cursorMonth: Date,
  ): Promise<TimelineDescriptorDataset[]> {
    const cursorWindow = this.createTimelineMonthWindow(cursorMonth);

    return Promise.all(
      descriptors.map(async (descriptor) => {
        const relationFilter = this.buildTimelineReverseFilter(
          descriptor.relationFields,
          mainHandle,
        );
        const records = await this.findTimelineRecords(
          descriptor.entityHandle,
          this.combineWhere(
            relationFilter,
            this.buildTimelineRecordUpperBoundFilter(
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

  private buildTimelineEntitySummary(
    dataset: TimelineDescriptorDataset,
    monthWindow: TimelineMonthWindow,
  ): TimelineEntitySummaryDto | null {
    const { descriptor, relationFilter, records } = dataset;
    const monthRecords = this.filterTimelineRecordsByMonth(
      records,
      descriptor.dateFields,
      monthWindow,
    );

    if (monthRecords.length === 0) {
      return null;
    }

    const startCount = monthRecords.filter((record) =>
      this.isTimelineBoundaryWithinMonth(
        record,
        descriptor.dateFields,
        'start',
        monthWindow,
      ),
    ).length;
    const endCount = monthRecords.filter((record) =>
      this.isTimelineBoundaryWithinMonth(
        record,
        descriptor.dateFields,
        'end',
        monthWindow,
      ),
    ).length;

    const summary = new TimelineEntitySummaryDto();
    summary.entityHandle = descriptor.entityHandle;
    summary.label = this.humanizeKey(descriptor.entityHandle);
    summary.relationCategory = descriptor.relationCategory;
    summary.relationFields = descriptor.relationFields.map(
      (field) => field.name,
    );
    summary.count = monthRecords.length;
    summary.startCount = startCount;
    summary.endCount = endCount;
    summary.startField = descriptor.dateFields.startFieldName;
    summary.endField = descriptor.dateFields.endFieldName;
    summary.startFilter = this.buildTimelineActivityFilter(
      relationFilter,
      descriptor.dateFields,
      'start',
      monthWindow,
    ) as Record<string, unknown>;
    summary.endFilter = this.buildTimelineActivityFilter(
      relationFilter,
      descriptor.dateFields,
      'end',
      monthWindow,
    ) as Record<string, unknown>;

    summary.groups = [
      ...this.buildTimelineChipGroups(
        descriptor,
        relationFilter,
        monthRecords,
        monthWindow,
      ),
      ...this.buildTimelineBooleanGroups(
        descriptor,
        relationFilter,
        monthRecords,
        monthWindow,
      ),
    ];

    return summary;
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
    const entityClass = this.getEntityClass<TimelineRecordResult>(entityHandle);
    const populate = this.buildPopulate(['m:1'], template);
    const records = await this.em.find(entityClass, preparedWhere, {
      populate,
      orderBy: { updatedAt: 'DESC', createdAt: 'DESC' },
    });

    return this.sanitizeEntityResult(entityHandle, records, template);
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
      this.setTopLevelFilter(nextWhere, currentUser, entityHandle),
      stringFields,
    );

    return this.convertDateStrings(nextWhere, template);
  }

  private buildTimelineChipGroups(
    descriptor: TimelineRelationDescriptor,
    relationFilter: object,
    records: Record<string, unknown>[],
    monthWindow: TimelineMonthWindow,
  ): TimelineSummaryGroupDto[] {
    return descriptor.chipFields
      .map((field) => {
        const items = new Map<
          string,
          {
            identity: TimelineGroupIdentity;
            count: number;
            amount: number | null;
          }
        >();

        for (const record of records) {
          const identity = this.getTimelineGroupIdentity(
            field,
            record[field.name],
          );
          if (!identity) {
            continue;
          }

          const entry = items.get(identity.key) ?? {
            identity,
            count: 0,
            amount: descriptor.moneyField ? 0 : null,
          };

          entry.count += 1;

          if (descriptor.moneyField) {
            const amount = this.getNumericValue(
              record[descriptor.moneyField.name],
            );
            if (amount != null && entry.amount != null) {
              entry.amount += amount;
            }
          }

          items.set(identity.key, entry);
        }

        if (items.size === 0) {
          return null;
        }

        const group = new TimelineSummaryGroupDto();
        group.field = field.name;
        group.label = this.humanizeKey(field.name);
        group.items = [...items.values()]
          .sort((left, right) => right.count - left.count)
          .map((entry) =>
            this.createTimelineSummaryGroupItem(
              entry.identity,
              entry.count,
              entry.amount,
              descriptor.moneyField?.name ?? null,
              this.combineWhere(
                this.buildTimelineMonthFilter(
                  relationFilter,
                  descriptor.dateFields,
                  monthWindow,
                ),
                this.buildTimelineGroupFilter(
                  field.name,
                  entry.identity.rawValue,
                ),
              ),
            ),
          );

        return group;
      })
      .filter((group): group is TimelineSummaryGroupDto => group !== null);
  }

  private buildTimelineBooleanGroups(
    descriptor: TimelineRelationDescriptor,
    relationFilter: object,
    records: Record<string, unknown>[],
    monthWindow: TimelineMonthWindow,
  ): TimelineSummaryGroupDto[] {
    if (descriptor.chipFields.length > 0) {
      return [];
    }

    return descriptor.booleanFields
      .map((field) => {
        const truthyCount = records.filter(
          (record) => record[field.name] === true,
        ).length;
        const falsyCount = records.filter(
          (record) => record[field.name] === false,
        ).length;

        if (truthyCount === 0 && falsyCount === 0) {
          return null;
        }

        const group = new TimelineSummaryGroupDto();
        group.field = field.name;
        group.label = this.humanizeKey(field.name);
        group.items = [
          this.createTimelineSummaryGroupItem(
            {
              key: 'true',
              label: 'Ja',
              rawValue: true,
            },
            truthyCount,
            null,
            null,
            this.combineWhere(
              this.buildTimelineMonthFilter(
                relationFilter,
                descriptor.dateFields,
                monthWindow,
              ),
              this.buildTimelineGroupFilter(field.name, true),
            ),
          ),
          this.createTimelineSummaryGroupItem(
            {
              key: 'false',
              label: 'Nein',
              rawValue: false,
            },
            falsyCount,
            null,
            null,
            this.combineWhere(
              this.buildTimelineMonthFilter(
                relationFilter,
                descriptor.dateFields,
                monthWindow,
              ),
              this.buildTimelineGroupFilter(field.name, false),
            ),
          ),
        ].filter((item) => item.count > 0);

        return group.items.length > 0 ? group : null;
      })
      .filter((group): group is TimelineSummaryGroupDto => group !== null);
  }

  private createTimelineSummaryGroupItem(
    identity: TimelineGroupIdentity,
    count: number,
    amount: number | null,
    moneyField: string | null,
    drilldownFilter: object,
  ): TimelineSummaryGroupItemDto {
    const item = new TimelineSummaryGroupItemDto();
    item.key = identity.key;
    item.label = identity.label;
    item.color = identity.color ?? null;
    item.icon = identity.icon ?? null;
    item.count = count;
    item.amount = amount;
    item.moneyField = moneyField;
    item.drilldownFilter = drilldownFilter as Record<string, unknown>;
    return item;
  }

  private buildTimelineReverseFilter(
    relationFields: EntityTemplateDto[],
    handle: string | number,
  ): object {
    const clauses = relationFields.map((field) => ({ [field.name]: handle }));

    if (clauses.length === 0) {
      return {};
    }

    if (clauses.length === 1) {
      return clauses[0];
    }

    return { $or: clauses };
  }

  private groupTimelineRelationFields(
    relationFields: EntityTemplateDto[],
    mainEntityHandle: string,
  ): EntityTemplateDto[][] {
    const prioritizedOption =
      mainEntityHandle === 'person'
        ? 'isPerson'
        : mainEntityHandle === 'company'
          ? 'isCompany'
          : null;

    if (!prioritizedOption) {
      return relationFields.length > 0 ? [relationFields] : [];
    }

    const prioritizedFields = relationFields.filter((field) =>
      field.options?.includes(prioritizedOption),
    );

    if (prioritizedFields.length <= 1) {
      return relationFields.length > 0 ? [relationFields] : [];
    }

    const prioritizedNames = new Set(
      prioritizedFields.map((field) => field.name),
    );
    const remainingFields = relationFields.filter(
      (field) => !prioritizedNames.has(field.name),
    );

    return [
      ...prioritizedFields.map((field) => [field]),
      ...(remainingFields.length > 0 ? [remainingFields] : []),
    ];
  }

  private getTimelineRelationCategory(
    relationFields: EntityTemplateDto[],
  ): string | null {
    return relationFields.length > 1 ? 'reference' : null;
  }

  private buildTimelineMonthFilter(
    relationFilter: object,
    dateFields: TimelineDateFieldConfig,
    monthWindow: TimelineMonthWindow,
  ): object {
    return this.combineWhere(
      relationFilter,
      this.buildTimelineSpanOverlapFilter(dateFields, monthWindow),
    );
  }

  private buildTimelineActivityFilter(
    relationFilter: object,
    dateFields: TimelineDateFieldConfig,
    boundary: 'start' | 'end',
    monthWindow: TimelineMonthWindow,
  ): object {
    const fieldName =
      boundary === 'start'
        ? dateFields.startFieldName
        : dateFields.endFieldName;
    const fallbackFieldName =
      boundary === 'start'
        ? dateFields.startFallbackFieldName
        : dateFields.endFallbackFieldName;

    return this.combineWhere(
      relationFilter,
      this.buildTimelineBoundaryMonthFilter(
        fieldName,
        fallbackFieldName,
        monthWindow,
      ),
    );
  }

  private buildTimelineSpanOverlapFilter(
    dateFields: TimelineDateFieldConfig,
    monthWindow: TimelineMonthWindow,
  ): object {
    return {
      $and: [
        this.buildTimelineBoundaryComparisonFilter(
          dateFields.startFieldName,
          dateFields.startFallbackFieldName,
          '$lte',
          monthWindow.end,
        ),
        this.buildTimelineBoundaryComparisonFilter(
          dateFields.endFieldName,
          dateFields.endFallbackFieldName,
          '$gte',
          monthWindow.start,
        ),
      ],
    };
  }

  private buildTimelineBoundaryComparisonFilter(
    fieldName: string,
    fallbackFieldName: string,
    operator: '$gte' | '$lte',
    value: Date,
  ): object {
    if (fieldName === fallbackFieldName) {
      return { [fieldName]: { [operator]: value } };
    }

    return {
      $or: [
        { [fieldName]: { [operator]: value } },
        {
          $and: [
            { [fieldName]: null },
            { [fallbackFieldName]: { [operator]: value } },
          ],
        },
      ],
    };
  }

  private buildTimelineBoundaryMonthFilter(
    fieldName: string,
    fallbackFieldName: string,
    monthWindow: TimelineMonthWindow,
  ): object {
    if (fieldName === fallbackFieldName) {
      return {
        [fieldName]: {
          $gte: monthWindow.start,
          $lte: monthWindow.end,
        },
      };
    }

    return {
      $or: [
        {
          [fieldName]: {
            $gte: monthWindow.start,
            $lte: monthWindow.end,
          },
        },
        {
          $and: [
            { [fieldName]: null },
            {
              [fallbackFieldName]: {
                $gte: monthWindow.start,
                $lte: monthWindow.end,
              },
            },
          ],
        },
      ],
    };
  }

  private buildTimelineRecordUpperBoundFilter(
    dateFields: TimelineDateFieldConfig,
    upperBound: Date,
  ): object {
    return this.buildTimelineBoundaryComparisonFilter(
      dateFields.startFieldName,
      dateFields.startFallbackFieldName,
      '$lte',
      upperBound,
    );
  }

  private getTimelineDateFieldConfig(
    template: EntityTemplateDto[],
  ): TimelineDateFieldConfig {
    const startField =
      template.find((field) => field.options?.includes('isDateStart')) ??
      template.find((field) => field.name === 'createdAt') ??
      null;
    const endField =
      template.find((field) => field.options?.includes('isDateEnd')) ??
      template.find((field) => field.name === 'updatedAt') ??
      null;

    return {
      startFieldName: startField?.name ?? 'createdAt',
      endFieldName: endField?.name ?? 'updatedAt',
      startFallbackFieldName: 'createdAt',
      endFallbackFieldName: 'updatedAt',
    };
  }

  private getTimelineDateSpan(
    record: Record<string, unknown>,
    dateFields: TimelineDateFieldConfig,
  ): TimelineDateSpan {
    const primaryStart = this.getRecordDate(record[dateFields.startFieldName]);
    const fallbackStart =
      dateFields.startFieldName !== dateFields.startFallbackFieldName
        ? this.getRecordDate(record[dateFields.startFallbackFieldName])
        : null;
    const primaryEnd = this.getRecordDate(record[dateFields.endFieldName]);
    const fallbackEnd =
      dateFields.endFieldName !== dateFields.endFallbackFieldName
        ? this.getRecordDate(record[dateFields.endFallbackFieldName])
        : null;

    const start = primaryStart ?? fallbackStart ?? primaryEnd ?? fallbackEnd;
    const end = primaryEnd ?? fallbackEnd ?? primaryStart ?? fallbackStart;

    return {
      start: start ?? null,
      end: end ?? null,
    };
  }

  private filterTimelineRecordsByMonth(
    records: Record<string, unknown>[],
    dateFields: TimelineDateFieldConfig,
    monthWindow: TimelineMonthWindow,
  ): Record<string, unknown>[] {
    return records.filter((record) => {
      const span = this.getTimelineDateSpan(record, dateFields);

      if (!span.start && !span.end) {
        return false;
      }

      const start = span.start ?? span.end;
      const end = span.end ?? span.start;

      if (!start || !end) {
        return false;
      }

      return (
        start.getTime() <= monthWindow.end.getTime() &&
        end.getTime() >= monthWindow.start.getTime()
      );
    });
  }

  private buildTimelineGroupFilter(
    fieldName: string,
    rawValue: string | number | boolean | null,
  ): object {
    return { [fieldName]: rawValue };
  }

  private combineWhere(base: object, addition: object): object {
    if (!base || Object.keys(base).length === 0) {
      return addition;
    }

    if (!addition || Object.keys(addition).length === 0) {
      return base;
    }

    return { $and: [base, addition] };
  }

  private getTimelineGroupIdentity(
    field: EntityTemplateDto,
    value: unknown,
  ): TimelineGroupIdentity | null {
    if (value == null) {
      return null;
    }

    if (typeof value === 'object') {
      const referenceValue = value as Record<string, unknown>;
      const rawValue = this.extractHandleValue(referenceValue);
      const label =
        this.buildTimelineRecordLabel(
          referenceValue,
          field.referenceName
            ? this.templateService.getEntityTemplate(field.referenceName)
            : [],
          field.referenceName,
        ) || String(rawValue ?? '-');

      return {
        key: String(rawValue ?? label),
        label,
        color:
          typeof referenceValue.color === 'string'
            ? referenceValue.color
            : null,
        icon:
          typeof referenceValue.icon === 'string' ? referenceValue.icon : null,
        rawValue: rawValue ?? null,
      };
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return {
        key: String(value),
        label: String(value),
        rawValue: value,
      };
    }

    return null;
  }

  private buildTimelineRecordLabel(
    record: Record<string, unknown>,
    template: EntityTemplateDto[],
    fallback?: string,
  ): string {
    const compactParts = template
      .filter((field) => field.options?.includes('isShowInCompact'))
      .map((field) => this.getTimelineDisplayValue(field, record[field.name]))
      .filter((value): value is string => value.length > 0);

    if (compactParts.length > 0) {
      return compactParts.join(' ');
    }

    const fallbackFields = ['title', 'name', 'description', 'number', 'handle'];
    for (const fieldName of fallbackFields) {
      const value = record[fieldName];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }

      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
    }

    return fallback ? this.humanizeKey(fallback) : '-';
  }

  private getTimelineDisplayValue(
    field: EntityTemplateDto,
    value: unknown,
  ): string {
    if (value == null) {
      return '';
    }

    if (typeof value === 'object' && field.referenceName) {
      return this.buildTimelineRecordLabel(
        value as Record<string, unknown>,
        this.templateService.getEntityTemplate(field.referenceName),
        field.referenceName,
      );
    }

    if (typeof value === 'string') {
      return value.trim();
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return '';
  }

  private getNumericValue(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsedValue = Number(value);
      return Number.isFinite(parsedValue) ? parsedValue : null;
    }

    return null;
  }

  private createTimelineMonthWindow(baseDate: Date): TimelineMonthWindow {
    const start = this.getMonthStart(baseDate);
    const end = this.getMonthEnd(baseDate);
    const month = `${String(start.getMonth() + 1).padStart(2, '0')}`;
    const year = start.getFullYear();

    return {
      key: `${year}-${month}`,
      label: `${month}/${year}`,
      start,
      end,
    };
  }

  private parseTimelineCursor(value?: string): Date | null {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value.trim())) {
      return null;
    }

    const [year, month] = value.trim().split('-').map(Number);
    if (!year || !month || month < 1 || month > 12) {
      return null;
    }

    return new Date(year, month - 1, 1);
  }

  private formatTimelineCursor(value: Date): string {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
  }

  private getMonthStart(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), 1, 0, 0, 0, 0);
  }

  private getMonthEnd(value: Date): Date {
    return new Date(
      value.getFullYear(),
      value.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
  }

  private addMonths(value: Date, delta: number): Date {
    return new Date(
      value.getFullYear(),
      value.getMonth() + delta,
      1,
      0,
      0,
      0,
      0,
    );
  }

  private getRecordDate(value: unknown): Date | null {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsedDate = new Date(value);
      return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
    }

    return null;
  }

  private isTimelineBoundaryWithinMonth(
    record: Record<string, unknown>,
    dateFields: TimelineDateFieldConfig,
    boundary: 'start' | 'end',
    monthWindow: TimelineMonthWindow,
  ): boolean {
    const span = this.getTimelineDateSpan(record, dateFields);
    const parsedDate = boundary === 'start' ? span.start : span.end;
    if (!parsedDate) {
      return false;
    }

    return (
      parsedDate.getTime() >= monthWindow.start.getTime() &&
      parsedDate.getTime() <= monthWindow.end.getTime()
    );
  }

  private toIsoString(value: unknown): string | null {
    const parsedDate = this.getRecordDate(value);
    return parsedDate ? parsedDate.toISOString() : null;
  }

  private humanizeKey(value: string): string {
    return value
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, (character) => character.toUpperCase());
  }
  // #endregion

  // #region Security
  /**
   * Checks if data manipulation (create, update, delete) is allowed.
   * All fields with isCompany and isPerson must match the current user's company/person.
   * @param {string} entityHandle Name of the entity
   * @param {Record<string, any>} data Data to check
   * @param {PersonItem} currentUser Current user object
   * @param {'allowInsertStage' | 'allowUpdateStage' | 'allowDeleteStage'} stage Operation stage
   * @returns {void}
   */
  private checkTopLevelPermission(
    entityHandle: string,
    data: Record<string, any>,
    currentUser: PersonItem,
    stage: 'allowInsertStage' | 'allowUpdateStage' | 'allowDeleteStage',
  ): void {
    const template = this.templateService.getEntityTemplate(entityHandle);
    const permission = this.currentService.getEntityPermissions(
      currentUser,
      entityHandle,
    );

    if (permission[stage] === 'global') return;

    const companyFields = this.getSpecialFields(
      entityHandle,
      template,
      'isCompany',
    );

    const personFields = this.getSpecialFields(
      entityHandle,
      template,
      'isPerson',
    );

    const entityFields = this.getSpecialFields(
      entityHandle,
      template,
      'isEntity',
    );

    this.applyEntityManipulation(data, entityFields, currentUser);

    switch (permission[stage]) {
      case 'person':
        this.applyPersonManipulation(data, personFields, currentUser);
        this.applyCompanyManipulation(data, companyFields, currentUser);
        break;
      case 'company':
        this.applyCompanyManipulation(data, companyFields, currentUser);
        break;
    }
  }

  /**
   * Checks if all personFields in data match the current user's handle.
   * @param {Record<string, any>} data Data to check
   * @param {string[]} personFields List of person field names
   * @param {PersonItem} currentUser Current user object
   * @returns {void}
   */
  private applyPersonManipulation(
    data: Record<string, any>,
    personFields: string[],
    currentUser: PersonItem,
  ) {
    if (!personFields || personFields.length === 0) return;
    if (!data) throw new ForbiddenException('global.permissionDenied');
    let match = false;
    for (const personField of personFields) {
      const personHandle = this.extractHandleValue(data[personField]);

      if (
        personField in data &&
        (personHandle === currentUser.handle || personHandle == null)
      ) {
        match = true;
        break;
      }
    }
    if (!match) {
      throw new ForbiddenException('global.permissionDenied');
    }
  }

  /**
   * Checks if all companyFields in data match the current user's company handle.
   * @param {Record<string, any>} data Data to check
   * @param {string[]} companyFields List of company field names
   * @param {PersonItem} currentUser Current user object
   * @returns {void}
   */
  private applyCompanyManipulation(
    data: Record<string, any>,
    companyFields: string[],
    currentUser: PersonItem,
  ) {
    if (!companyFields || companyFields.length === 0) return;
    if (!data) throw new ForbiddenException('global.permissionDenied');
    let match = false;
    for (const companyField of companyFields) {
      const companyHandle = this.extractHandleValue(data[companyField]);

      if (
        companyField in data &&
        (companyHandle === currentUser.company?.handle || companyHandle == null)
      ) {
        match = true;
        break;
      }
    }
    if (!match) {
      throw new ForbiddenException('global.permissionDenied');
    }
  }

  /**
   * Checks if all entityFields in data match the entities readable by the current user.
   * @param {Record<string, any>} data Data to check
   * @param {string[]} entityFields List of entity field names
   * @param {PersonItem} currentUser Current user object
   * @returns {void}
   */
  private applyEntityManipulation(
    data: Record<string, any>,
    entityFields: string[],
    currentUser: PersonItem,
  ) {
    if (!entityFields || entityFields.length === 0) return;
    if (!data) throw new ForbiddenException('global.permissionDenied');

    const allowedEntityHandles = this.getAllowedEntityHandles(currentUser);
    let match = false;

    for (const entityField of entityFields) {
      const entityValue = this.extractHandleValue(data[entityField]);
      const normalizedEntityHandle =
        entityValue == null ? null : String(entityValue);

      if (
        entityField in data &&
        (normalizedEntityHandle == null ||
          allowedEntityHandles.includes(normalizedEntityHandle))
      ) {
        match = true;
        break;
      }
    }

    if (!match) {
      throw new ForbiddenException('global.permissionDenied');
    }
  }

  /**
   * Applies top-level security filters to the query based on user permissions.
   * @param {object} where The current filter object
   * @param {PersonItem} currentUser The current user
   * @param {string} entityHandle The entity handle
   * @returns {object} The filtered query object
   */
  private setTopLevelFilter(
    where: object,
    currentUser: PersonItem,
    entityHandle: string,
  ): object {
    const permission = this.currentService.getEntityPermissions(
      currentUser,
      entityHandle,
    );

    where = this.setEntityLevelFilter(where, currentUser, entityHandle);
    if (permission.allowReadStage === 'global') return where;

    const companyFields = this.getSpecialFields(
      entityHandle,
      this.templateService.getEntityTemplate(entityHandle),
      'isCompany',
    );

    const personFields = this.getSpecialFields(
      entityHandle,
      this.templateService.getEntityTemplate(entityHandle),
      'isPerson',
    );

    switch (permission.allowReadStage) {
      case 'person':
        where = this.applyPersonFields(where, personFields, currentUser);
        where = this.applyCompanyFields(where, companyFields, currentUser);
        break;
      case 'company':
        where = this.applyCompanyFields(where, companyFields, currentUser);
        break;
    }
    return where;
  }

  /**
   * Adds entity-level filters based on fields with isEntity=true. Allows only entities where the field value is in the list of allowed entity handles for the user, or null.
   * @param {object} where The current filter object
   * @param {PersonItem} currentUser The current user
   * @param {string} entityHandle The entity handle
   * @returns {object} The filtered query object
   */
  private setEntityLevelFilter(
    where: object,
    currentUser: PersonItem,
    entityHandle: string,
  ): object {
    const entityFields = this.getSpecialFields(
      entityHandle,
      this.templateService.getEntityTemplate(entityHandle),
      'isEntity',
    );

    const entityFilter = this.applyEntityFields({}, entityFields, currentUser);
    if (Object.keys(entityFilter).length === 0) {
      return where;
    }
    // Always combine with $and, regardless of original filter type
    if (where && Object.keys(where).length > 0) {
      return { $and: [where, entityFilter] };
    }
    return entityFilter;
  }

  /**
   * Adds entityFields filters to the where object for security based on permissions.
   * Only entities for which the user's roles have allowRead=true are included.
   * Uses getAllEntityPermissions from CurrentService for permission aggregation.
   * @param {object} where The current filter object
   * @param {string[]} entityFields List of entity field names
   * @param {PersonItem} currentUser The current user
   * @returns {object} The filtered query object
   */
  private applyEntityFields(
    where: object,
    entityFields: string[],
    currentUser: PersonItem,
  ): object {
    const allowedEntityHandles = this.getAllowedEntityHandles(currentUser);

    for (const entityField of entityFields) {
      const allowedValues = [...allowedEntityHandles];
      const orCondition = [
        { [entityField]: { $in: allowedValues } },
        { [entityField]: null },
      ];
      if (Array.isArray(where)) {
        where = (where as Record<string, any>[]).map((x) => ({
          ...x,
          $or: orCondition,
        }));
      } else {
        // Kombiniere bestehende where-Bedingung mit $or
        if (Object.keys(where).length > 0) {
          where = { $and: [where, { $or: orCondition }] };
        } else {
          where = { $or: orCondition };
        }
      }
    }
    return where;
  }

  /**
   * Returns all entity handles the current user can read.
   * @param {PersonItem} currentUser The current user
   * @returns {string[]} Allowed entity handles
   */
  private getAllowedEntityHandles(currentUser: PersonItem): string[] {
    return this.currentService
      .getAllEntityPermissions(currentUser)
      .flatMap((perm) =>
        perm.allowRead && perm.entityHandle ? [perm.entityHandle] : [],
      );
  }

  /**
   * Adds personFields filters to the where object for security.
   * @param {object} where The current filter object
   * @param {string[]} personFields List of person field names
   * @param {PersonItem} currentUser The current user
   * @returns {object} The filtered query object
   */
  private applyPersonFields(
    where: object,
    personFields: string[],
    currentUser: PersonItem,
  ): object {
    if (!personFields || personFields.length === 0) return where;
    if (personFields.length === 1) {
      const personField = personFields[0];
      if (Array.isArray(where)) {
        return (where as Record<string, any>[]).map((x) => ({
          ...x,
          [personField]: currentUser.handle,
        }));
      } else {
        return { ...where, [personField]: currentUser.handle };
      }
    }
    // Mehrere personFields: where und $or gemeinsam mit $and verknüpfen
    const orConditions = personFields.map((personField) => ({
      [personField]: currentUser.handle,
    }));
    if (where && Object.keys(where).length > 0) {
      return { $and: [where, { $or: orConditions }] };
    } else {
      return { $or: orConditions };
    }
  }

  /**
   * Adds companyFields filters to the where object for security.
   * @param {object} where The current filter object
   * @param {string[]} companyFields List of company field names
   * @param {PersonItem} currentUser The current user
   * @returns {object} The filtered query object
   */
  private applyCompanyFields(
    where: object,
    companyFields: string[],
    currentUser: PersonItem,
  ): object {
    if (!companyFields || companyFields.length === 0) return where;
    if (companyFields.length === 1) {
      const companyField = companyFields[0];
      if (Array.isArray(where)) {
        return (where as Record<string, any>[]).map((x) => ({
          ...x,
          [companyField]: currentUser.company?.handle,
        }));
      } else {
        return { ...where, [companyField]: currentUser.company?.handle };
      }
    }
    // Mehrere companyFields: where und $or gemeinsam mit $and verknüpfen
    const orConditions = companyFields.map((companyField) => ({
      [companyField]: currentUser.company?.handle,
    }));
    if (where && Object.keys(where).length > 0) {
      return { $and: [where, { $or: orConditions }] };
    } else {
      return { $or: orConditions };
    }
  }

  /**
   * Returns all field names that have isCompany, isPerson, or isEntity set in SaplingMetadata.
   * @param {string} entityHandle Name of the entity
   * @param {EntityTemplateDto[]} template Entity template array
   * @param {'isCompany' | 'isPerson' | 'isEntity'} type Type of special field
   * @returns {string[]} List of field names
   */
  private getSpecialFields(
    entityHandle: string,
    template: EntityTemplateDto[],
    type: 'isCompany' | 'isPerson' | 'isEntity',
  ): string[] {
    if (!template) return [];
    const entityClass = entityMap[entityHandle] as { prototype: object };
    return template
      .map((x) => x.name)
      .filter(
        (fieldName) =>
          entityClass &&
          typeof entityClass.prototype === 'object' &&
          hasSaplingOption(entityClass.prototype, fieldName, type),
      );
  }

  /**
   * Removes all fields with isSecurity=true from the items.
   * @param {string} entityHandle Name of the entity
   * @param {EntityTemplateDto[]} template Entity template array
   * @param {object[]} items Array of entity items
   * @returns {object[]} Filtered items
   */
  private removeSecurityFields(
    entityHandle: string,
    template: EntityTemplateDto[],
    items: object[],
  ): object[] {
    return items.map((item) =>
      this.sanitizeEntityResult(entityHandle, item, template),
    );
  }

  // #endregion

  // #region Helper
  /**
   * Returns the entity class for a given name.
   * @param {string} entityHandle The entity handle
   * @returns {EntityName<T>} Entity class
   */
  private getEntityClass<T = object>(entityHandle: string): EntityName<T> {
    const entityClass = entityMap[entityHandle] as EntityName<T> | undefined;
    if (!entityClass) {
      throw new NotFoundException(`global.entityNotFound`);
    }
    return entityClass;
  }

  /**
   * Builds the populate list based on relations and template.
   * @param {string[]} relations The relations to populate
   * @param {EntityTemplateDto[]} template The entity template
   * @returns {string[]} Array of relation names to populate
   */
  private buildPopulate(
    relations: string[],
    template: EntityTemplateDto[],
  ): string[] {
    const populate: string[] = [];
    if (relations.includes('*')) {
      const refs: string[] = template
        .filter((x) => !!x.isReference)
        .map((x) => x.name);
      populate.push(...refs);
    } else {
      if (relations.includes('1:m')) {
        const refs: string[] = template
          .filter((x) => !!x.isReference && x.kind === '1:m')
          .map((x) => x.name);
        populate.push(...refs);
      }
      if (relations.includes('m:1')) {
        const refs: string[] = template
          .filter((x) => !!x.isReference && x.kind === 'm:1')
          .map((x) => x.name);
        populate.push(...refs);
      }
      if (relations.includes('m:n')) {
        const refs: string[] = template
          .filter((x) => !!x.isReference && x.kind === 'm:n')
          .map((x) => x.name);
        populate.push(...refs);
      }
      if (relations.includes('n:m')) {
        const refs: string[] = template
          .filter((x) => !!x.isReference && x.kind === 'n:m')
          .map((x) => x.name);
        populate.push(...refs);
      }
      const namedRefs: string[] = relations.filter((relation) => {
        return template.some((field) => {
          return (
            !!field.isReference &&
            (relation === field.name || relation.startsWith(`${field.name}.`))
          );
        });
      });
      populate.push(...namedRefs);
    }
    return [...new Set(populate)];
  }

  private normalizeQueryCriteria(
    entityHandle: string,
    criteria: object,
    mode: 'filter' | 'orderBy',
  ): object {
    if (!this.isPlainRecord(criteria)) {
      return criteria;
    }

    const normalizedRecord: Record<string, unknown> = {};

    for (const [rawKey, rawValue] of Object.entries(criteria)) {
      const normalizedKey = rawKey.trim();

      if (!normalizedKey) {
        continue;
      }

      if (normalizedKey.startsWith('$')) {
        if (Array.isArray(rawValue)) {
          const arrayValue = rawValue as unknown[];

          normalizedRecord[normalizedKey] = arrayValue.map((item) =>
            this.isPlainRecord(item)
              ? this.normalizeQueryCriteria(entityHandle, item, mode)
              : item,
          );
        } else {
          normalizedRecord[normalizedKey] = rawValue;
        }

        continue;
      }

      if (normalizedKey.includes('.')) {
        this.mergeNormalizedRecord(
          normalizedRecord,
          this.normalizeDottedQueryCriteria(
            entityHandle,
            normalizedKey,
            rawValue,
            mode,
          ),
        );
        continue;
      }

      const field = this.getTemplateField(entityHandle, normalizedKey);

      if (field?.isReference && field.referenceName && mode === 'filter') {
        normalizedRecord[normalizedKey] = this.normalizeReferenceCriteriaValue(
          field,
          rawValue,
          mode,
        );
        continue;
      }

      normalizedRecord[normalizedKey] =
        mode === 'filter'
          ? this.normalizeFieldCriteriaValue(field, rawValue)
          : rawValue;
    }

    return normalizedRecord;
  }

  private normalizeDottedQueryCriteria(
    entityHandle: string,
    dottedKey: string,
    rawValue: unknown,
    mode: 'filter' | 'orderBy',
  ): Record<string, unknown> {
    const [head, ...rest] = dottedKey
      .split('.')
      .map((segment) => segment.trim())
      .filter(Boolean);

    if (!head || rest.length === 0) {
      throw new BadRequestException(
        'exception.badRequest',
        `Invalid ${mode} field "${dottedKey}"`,
      );
    }

    const field = this.getTemplateField(entityHandle, head);

    if (!field?.isReference || !field.referenceName) {
      throw new BadRequestException(
        'exception.badRequest',
        `Invalid ${mode} field "${dottedKey}"`,
      );
    }

    return {
      [head]: this.normalizeQueryCriteria(
        field.referenceName,
        { [rest.join('.')]: rawValue },
        mode,
      ),
    };
  }

  private mergeNormalizedRecord(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
  ): void {
    for (const [key, value] of Object.entries(source)) {
      const existingValue = target[key];

      if (
        existingValue &&
        typeof existingValue === 'object' &&
        !Array.isArray(existingValue) &&
        value &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        this.mergeNormalizedRecord(
          existingValue as Record<string, unknown>,
          value as Record<string, unknown>,
        );
        continue;
      }

      target[key] = value;
    }
  }

  private normalizeReferenceOperatorCriteria(
    field: EntityTemplateDto,
    relationRecord: Record<string, unknown>,
    mode: 'filter' | 'orderBy',
  ): Record<string, unknown> {
    if (mode !== 'filter') {
      return relationRecord;
    }

    const identifierKeys = this.getReferenceIdentifierKeys(field);
    if (identifierKeys.length !== 1) {
      return relationRecord;
    }

    return {
      [identifierKeys[0]]: this.normalizeFieldCriteriaValue(
        this.getTemplateField(field.referenceName, identifierKeys[0]),
        relationRecord,
      ),
    };
  }

  private normalizeReferenceCriteriaValue(
    field: EntityTemplateDto,
    rawValue: unknown,
    mode: 'filter' | 'orderBy',
  ): unknown {
    if (!field.referenceName) {
      return rawValue;
    }

    if (this.isPlainRecord(rawValue)) {
      const relationRecord = rawValue;
      const relationKeys = Object.keys(relationRecord).map((key) => key.trim());
      const containsOnlyOperators =
        relationKeys.length > 0 &&
        relationKeys.every((key) => this.isQueryOperatorKey(key));

      return containsOnlyOperators
        ? this.normalizeReferenceOperatorCriteria(field, relationRecord, mode)
        : this.normalizeQueryCriteria(
            field.referenceName,
            relationRecord,
            mode,
          );
    }

    const identifierField = this.getSingleReferenceIdentifierField(field);
    if (!identifierField) {
      return rawValue;
    }

    return {
      [identifierField.name]: this.normalizeFieldCriteriaValue(
        identifierField,
        rawValue,
      ),
    };
  }

  private getReferenceIdentifierKeys(field: EntityTemplateDto): string[] {
    if (field.referencedPks.length > 0) {
      return field.referencedPks;
    }

    if (!field.referenceName) {
      return [];
    }

    const referenceTemplate = this.templateService.getEntityTemplate(
      field.referenceName,
    );

    return ['handle', 'id'].filter((key) =>
      referenceTemplate.some((templateField) => templateField.name === key),
    );
  }

  private getSingleReferenceIdentifierField(
    field: EntityTemplateDto,
  ): EntityTemplateDto | null {
    if (!field.referenceName) {
      return null;
    }

    const identifierKeys = this.getReferenceIdentifierKeys(field);
    if (identifierKeys.length !== 1) {
      return null;
    }

    return (
      this.getTemplateField(field.referenceName, identifierKeys[0]) ?? null
    );
  }

  private normalizeFieldCriteriaValue(
    field: EntityTemplateDto | undefined,
    value: unknown,
  ): unknown {
    if (!field) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeFieldCriteriaValue(field, item));
    }

    if (!this.isPlainRecord(value)) {
      return this.normalizeScalarCriteriaValue(field, value);
    }

    const normalizedRecord: Record<string, unknown> = {};

    for (const [rawKey, rawValue] of Object.entries(value)) {
      const normalizedKey = rawKey.trim();
      normalizedRecord[normalizedKey] = this.isQueryOperatorKey(normalizedKey)
        ? this.normalizeFieldCriteriaValue(field, rawValue)
        : rawValue;
    }

    return normalizedRecord;
  }

  private normalizeScalarCriteriaValue(
    field: EntityTemplateDto,
    value: unknown,
  ): unknown {
    if (value == null) {
      return value;
    }

    if (field.type === 'number' && typeof value === 'string') {
      const trimmedValue = value.trim();
      if (!trimmedValue) {
        return value;
      }

      const parsedValue = Number(trimmedValue);
      return Number.isNaN(parsedValue) ? value : parsedValue;
    }

    if (
      field.type === 'string' &&
      (typeof value === 'number' || typeof value === 'boolean')
    ) {
      return String(value);
    }

    if (field.type === 'boolean' && typeof value === 'string') {
      const trimmedValue = value.trim().toLowerCase();
      if (trimmedValue === 'true') {
        return true;
      }
      if (trimmedValue === 'false') {
        return false;
      }
    }

    return value;
  }

  private collectQueryPopulateRelations(
    entityHandle: string,
    criteria: unknown,
  ): string[] {
    if (!this.isPlainRecord(criteria)) {
      return [];
    }

    const relations = new Set<string>();

    for (const [key, value] of Object.entries(criteria)) {
      if (key.startsWith('$')) {
        if (Array.isArray(value)) {
          value.forEach((item) => {
            this.collectQueryPopulateRelations(entityHandle, item).forEach(
              (relation) => relations.add(relation),
            );
          });
        }
        continue;
      }

      const field = this.getTemplateField(entityHandle, key);

      if (
        !field?.isReference ||
        !field.referenceName ||
        !this.isPlainRecord(value)
      ) {
        continue;
      }

      const nestedKeys = Object.keys(value).map((nestedKey: string) => {
        return nestedKey.trim();
      });
      const containsOnlyOperators =
        nestedKeys.length > 0 &&
        nestedKeys.every((nestedKey) => this.isQueryOperatorKey(nestedKey));

      if (containsOnlyOperators) {
        continue;
      }

      relations.add(key);
      this.collectQueryPopulateRelations(field.referenceName, value).forEach(
        (relation) => relations.add(`${key}.${relation}`),
      );
    }

    return [...relations];
  }

  private getTemplateField(
    entityHandle: string,
    fieldName: string,
  ): EntityTemplateDto | undefined {
    return this.templateService
      .getEntityTemplate(entityHandle)
      .find((field) => field.name === fieldName);
  }

  private isQueryOperatorKey(key: string): boolean {
    return key.startsWith('$');
  }

  /**
   * Reduces reference fields in the data object based on template and relations.
   * @param {EntityTemplateDto[]} template Entity template array
   * @param {object} data Data object
   * @param {string[]} relations Relations to include (default: ['*'])
   * @returns {object} Reduced data object
   */
  private reduceReferenceFields(
    template: EntityTemplateDto[],
    data: object,
    relations: string[] = ['*'],
  ): object {
    if (template) {
      for (const field of template.filter((x) => x.isReference)) {
        if (
          field.kind &&
          !(
            relations.includes(field.name) ||
            relations.includes(field.kind) ||
            relations.includes('*')
          )
        ) {
          delete (data as Record<string, any>)[field.name];
        } else {
          const value = (data as Record<string, unknown>)[field.name];
          let isHandled = false;

          switch (field.kind) {
            case 'm:1':
            case '1:1':
              if (value !== null) {
                if (this.isPlainRecord(value)) {
                  // value is a single object
                  if (field.referencedPks.length === 1) {
                    (data as Record<string, unknown>)[field.name] =
                      this.getReferencedValue(value, field.referencedPks[0]);
                  } else {
                    (data as Record<string, unknown>)[field.name] =
                      this.getReferencedValues(value, field.referencedPks);
                  }
                }
                isHandled = true;
              }
              break;
            case '1:m':
            case 'm:n':
            case 'n:m':
              if (this.isRecordArray(value)) {
                // value is an array of objects
                const arr = value;
                if (field.referencedPks.length === 1) {
                  (data as Record<string, unknown>)[field.name] = arr.map(
                    (el) => this.getReferencedValue(el, field.referencedPks[0]),
                  );
                } else {
                  (data as Record<string, unknown>)[field.name] = arr.map(
                    (el) => this.getReferencedValues(el, field.referencedPks),
                  );
                }
                isHandled = true;
              }
              break;
          }

          if (!isHandled) {
            delete (data as Record<string, any>)[field.name];
          }
        }
      }
    }
    return data;
  }

  private async validateReferenceDependencies(
    entityHandle: string,
    data: Record<string, unknown>,
    template: EntityTemplateDto[],
    currentUser: PersonItem,
  ): Promise<void> {
    const dependencyFields = template.filter(
      (field) =>
        field.isReference &&
        !!field.referenceName &&
        !!field.referenceDependency?.parentField &&
        !!field.referenceDependency?.targetField,
    );

    for (const field of dependencyFields) {
      const dependency = field.referenceDependency;
      if (!dependency) {
        continue;
      }

      const childValue = this.extractComparableDependencyValue(
        data[field.name],
      );
      if (childValue == null) {
        continue;
      }

      if (typeof childValue === 'boolean') {
        throw new BadRequestException(
          'exception.badRequest',
          `${field.name} must reference a valid record handle`,
        );
      }

      const parentValue = this.extractComparableDependencyValue(
        data[dependency.parentField],
      );

      if (parentValue == null) {
        if (dependency.requireParent) {
          throw new BadRequestException(
            'exception.badRequest',
            `${field.name} requires ${dependency.parentField}`,
          );
        }

        continue;
      }

      const referenceEntityHandle = field.referenceName ?? '';
      const childHandle = this.normalizeHandleValue(
        referenceEntityHandle,
        childValue,
      );
      const childFilter = this.setTopLevelFilter(
        this.getHandleFilter(referenceEntityHandle, childHandle),
        currentUser,
        referenceEntityHandle,
      );
      const referenceClass = this.getEntityClass(referenceEntityHandle);
      const childRecord = await this.em.findOne(
        referenceClass,
        childFilter,
        {},
      );

      if (!childRecord) {
        throw new BadRequestException('global.referenceNotFound');
      }

      const targetValue = this.extractComparableDependencyValue(
        (childRecord as Record<string, unknown>)[dependency.targetField],
      );

      if (!this.areDependencyValuesEqual(parentValue, targetValue)) {
        throw new BadRequestException(
          'exception.badRequest',
          `${field.name} is not valid for ${dependency.parentField}`,
        );
      }
    }
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

  private sanitizeEntityResult<T>(
    entityHandle: string,
    value: T,
    template: EntityTemplateDto[] = this.templateService.getEntityTemplate(
      entityHandle,
    ),
    visited = new WeakMap<object, unknown>(),
    active = new WeakSet<object>(),
  ): T {
    if (Array.isArray(value)) {
      if (visited.has(value)) {
        if (active.has(value)) {
          return [] as T;
        }

        return visited.get(value) as T;
      }

      const sanitizedArray: unknown[] = [];
      visited.set(value, sanitizedArray);

      active.add(value);
      try {
        value.forEach((item) => {
          sanitizedArray.push(
            this.sanitizeEntityResult(
              entityHandle,
              item,
              template,
              visited,
              active,
            ),
          );
        });
      } finally {
        active.delete(value);
      }

      return sanitizedArray as T;
    }

    if (this.isCollectionLike(value)) {
      if (!this.isInitializedCollectionLike(value)) {
        return [] as T;
      }

      return this.sanitizeEntityResult(
        entityHandle,
        value.toArray(),
        template,
        visited,
        active,
      ) as T;
    }

    if (typeof value !== 'object' || value === null) {
      return value;
    }

    const cachedValue = visited.get(value);
    if (typeof cachedValue !== 'undefined') {
      if (active.has(value)) {
        return this.createCircularReferenceFallback(value) as T;
      }

      return cachedValue as T;
    }

    const record = value as Record<string, unknown>;
    const sanitizedRecord: Record<string, unknown> = {};
    visited.set(value, sanitizedRecord);
    active.add(value);

    const entityClass = entityMap[entityHandle] as { prototype?: object };
    const securityFields = template
      .map((field) => field.name)
      .filter(
        (fieldName) =>
          entityClass &&
          typeof entityClass.prototype === 'object' &&
          hasSaplingOption(entityClass.prototype, fieldName, 'isSecurity'),
      );

    const recordKeys = Object.keys(record);
    const templateKeys = template
      .map((field) => field.name)
      .filter(
        (fieldName) => fieldName in record && !recordKeys.includes(fieldName),
      );
    const keys = [...new Set([...recordKeys, ...templateKeys])];

    try {
      for (const key of keys) {
        if (securityFields.includes(key)) {
          continue;
        }

        const field = template.find((entry) => entry.name === key);
        const fieldValue = record[key];

        if (field?.isReference && field.referenceName) {
          sanitizedRecord[key] = this.sanitizeEntityResult(
            field.referenceName,
            fieldValue,
            this.templateService.getEntityTemplate(field.referenceName),
            visited,
            active,
          );
          continue;
        }

        sanitizedRecord[key] = fieldValue;
      }
    } finally {
      active.delete(value);
    }

    return sanitizedRecord as T;
  }

  private createCircularReferenceFallback(
    value: object,
  ): Record<string, string | number> | null {
    const handle = this.extractHandleValue(value);

    if (typeof handle === 'string' || typeof handle === 'number') {
      return { handle };
    }

    return null;
  }

  private isCollectionLike(value: unknown): value is {
    toArray: () => unknown[];
    isInitialized?: () => boolean;
  } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'toArray' in value &&
      typeof (value as { toArray?: unknown }).toArray === 'function'
    );
  }

  private isInitializedCollectionLike(value: {
    isInitialized?: () => boolean;
  }): boolean {
    return typeof value.isInitialized !== 'function' || value.isInitialized();
  }

  private extractHandleValue(
    value: unknown,
  ): string | number | null | undefined {
    if (
      value == null ||
      typeof value === 'string' ||
      typeof value === 'number'
    ) {
      return value;
    }

    if (typeof value !== 'object') {
      return undefined;
    }

    const objectValue = value as Record<string, unknown>;

    if (
      'unwrap' in value &&
      typeof (value as { unwrap?: unknown }).unwrap === 'function'
    ) {
      return this.extractHandleValue(
        (value as { unwrap: () => unknown }).unwrap(),
      );
    }

    if (
      'getEntity' in value &&
      typeof (value as { getEntity?: unknown }).getEntity === 'function'
    ) {
      return this.extractHandleValue(
        (value as { getEntity: () => unknown }).getEntity(),
      );
    }

    if ('handle' in objectValue) {
      const nestedHandle = objectValue.handle;

      if (
        nestedHandle == null ||
        typeof nestedHandle === 'string' ||
        typeof nestedHandle === 'number'
      ) {
        return nestedHandle;
      }
    }

    return undefined;
  }

  private extractComparableDependencyValue(
    value: unknown,
  ): string | number | boolean | null | undefined {
    const handleValue = this.extractHandleValue(value);

    if (
      handleValue == null ||
      typeof handleValue === 'string' ||
      typeof handleValue === 'number'
    ) {
      return handleValue;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string' || typeof value === 'number') {
      return value;
    }

    return undefined;
  }

  private areDependencyValuesEqual(
    left: string | number | boolean | null | undefined,
    right: string | number | boolean | null | undefined,
  ): boolean {
    if (left == null || right == null) {
      return left === right;
    }

    return String(left) === String(right);
  }

  private isPlainRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private isRecordArray(value: unknown): value is Record<string, unknown>[] {
    return (
      Array.isArray(value) && value.every((entry) => this.isPlainRecord(entry))
    );
  }

  private getReferencedValue(
    value: Record<string, unknown>,
    referencedPk: string,
  ): unknown {
    return value[referencedPk];
  }

  private getReferencedValues(
    value: Record<string, unknown>,
    referencedPks: string[],
  ): unknown[] {
    return referencedPks.map((referencedPk) => value[referencedPk]);
  }

  private getRelationCollection(
    item: Record<string, unknown>,
    relationName: string,
  ): {
    init: (options: { where: { handle: string | number } }) => Promise<unknown>;
    add: (value: object) => void;
    remove: (value: object) => void;
  } {
    const relation = item[relationName];

    if (
      !relation ||
      typeof relation !== 'object' ||
      !('init' in relation) ||
      typeof relation.init !== 'function' ||
      !('add' in relation) ||
      typeof relation.add !== 'function' ||
      !('remove' in relation) ||
      typeof relation.remove !== 'function'
    ) {
      throw new BadRequestException(`global.referenceNotFound`);
    }

    return relation as {
      init: (options: {
        where: { handle: string | number };
      }) => Promise<unknown>;
      add: (value: object) => void;
      remove: (value: object) => void;
    };
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
