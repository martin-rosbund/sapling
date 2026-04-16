import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager, RequiredEntityData, EntityName } from '@mikro-orm/core';
import { ENTITY_MAP } from '../../entity/global/entity.registry';
import { hasSaplingOption } from '../../entity/global/entity.decorator';
import { TemplateService } from '../template/template.service';
import { EntityItem } from '../../entity/EntityItem';
import { PersonItem } from '../../entity/PersonItem';
import { CurrentService } from '../current/current.service';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';
import { performance } from 'perf_hooks';
import { ScriptResultServerMethods } from '../../script/core/script.result.server';
import { ScriptService, ScriptMethods } from '../script/script.service';

// #region Entity Map
const entityMap = ENTITY_MAP;
// #endregion

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
    const populate = this.buildPopulate(relations, template);
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
    const populate = this.buildPopulate(relations, template);
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
      data as Record<string, unknown>,
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

    // Nach dem Insert: neues Item mit allen Relationen laden
    const populatedItem = await this.em.findOne(
      entityClass,
      this.getHandleFilter(entityHandle, this.getRequiredHandle(newData)),
      {
        populate: this.buildPopulate(['*'], template) as any[],
      },
    );

    if (entity) {
      // Run script after insert
      const script = await this.scriptService.runServer(
        ScriptMethods.afterInsert,
        populatedItem || newData,
        entity,
        currentUser,
      );

      switch (script.method) {
        case ScriptResultServerMethods.overwrite:
          newData = script.items[0];
          newData = this.normalizeDatePayload(
            newData as Record<string, any>,
            template,
          );
          newData = this.em.assign(newData, newData);
          await this.em.flush();
          break;
      }
    }
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

    const populatedItem = await this.em.findOne(entityClass, handleFilter, {
      populate: this.buildPopulate(['*'], template) as any[],
    });

    if (entity && newData) {
      // Run script after update
      const script = await this.scriptService.runServer(
        ScriptMethods.afterUpdate,
        populatedItem || newData,
        entity,
        currentUser,
      );

      switch (script.method) {
        case ScriptResultServerMethods.overwrite:
          newData = script.items[0];
          newData = this.normalizeDatePayload(
            newData as Record<string, any>,
            template,
          );
          newData = this.em.assign(item, newData);
          await this.em.flush();
          break;
      }
    }
    return this.sanitizeEntityResult(entityHandle, newData, template);
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

    const populatedItem = await this.em.findOne(entityClass, handleFilter, {
      populate: this.buildPopulate(['*'], template) as any[],
    });

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
        populatedItem || item,
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

    const relation = this.getRelationCollection(
      item as Record<string, unknown>,
      name.name,
    );

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

    const relation = this.getRelationCollection(
      item as Record<string, unknown>,
      name.name,
    );

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
    return this.sanitizeEntityResult(entityHandle, items, template);
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
          return !!field.isReference && (relation === field.name || relation.startsWith(`${field.name}.`));
        });
      });
      populate.push(...namedRefs);
    }
    return populate;
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
    visited = new WeakSet<object>(),
  ): T {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        this.sanitizeEntityResult(entityHandle, item, template, visited);
      });
      return value;
    }

    if (this.isCollectionLike(value)) {
      if (!this.isInitializedCollectionLike(value)) {
        return value;
      }

      this.sanitizeEntityResult(
        entityHandle,
        value.toArray(),
        template,
        visited,
      );
      return value;
    }

    if (typeof value !== 'object' || value === null) {
      return value;
    }

    if (visited.has(value)) {
      return value;
    }

    visited.add(value);

    const record = value as Record<string, unknown>;

    const entityClass = entityMap[entityHandle] as { prototype?: object };
    const securityFields = template
      .map((field) => field.name)
      .filter(
        (fieldName) =>
          entityClass &&
          typeof entityClass.prototype === 'object' &&
          hasSaplingOption(entityClass.prototype, fieldName, 'isSecurity'),
      );

    for (const securityField of securityFields) {
      if (securityField in record) {
        record[securityField] = undefined;
      }
    }

    for (const field of template.filter((entry) => entry.isReference)) {
      const relationValue = record[field.name];

      if (relationValue == null || !field.referenceName) {
        continue;
      }

      this.sanitizeEntityResult(
        field.referenceName,
        relationValue,
        this.templateService.getEntityTemplate(field.referenceName),
        visited,
      );
    }

    return value;
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
