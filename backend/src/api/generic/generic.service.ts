/* eslint-disable @typescript-eslint/no-unsafe-member-access */
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
 * @method          update           Updates an entry by its primary keys
 * @method          delete           Deletes an entry by its primary keys
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

    // Filter: $like/$or nur auf String-Felder anwenden
    const stringFields = template
      ? template.filter((f) => f.type === 'string').map((f) => f.name)
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
      ? template.filter((f) => f.type === 'string').map((f) => f.name)
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
          delete (data as Record<string, any>)[field.name];
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

    const entityClass = this.getEntityClass(entityHandle);

    try {
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
    const primaryKeys = this.templateService.extractPrimaryKeyObject(
      template,
      newData,
    );

    const populatedItem = await this.em.findOne(entityClass, primaryKeys, {
      populate: this.buildPopulate(['*'], template) as any[],
    });

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
          newData = this.em.assign(newData, newData);
          await this.em.flush();
          break;
          break;
      }
    }
    return newData;
  }

  // #endregion

  // #region Update
  /**
   * Updates an entry by its primary keys, applies security, and runs before/after scripts.
   * @param {string} entityHandle Name of the entity
   * @param {Record<string, any>} primaryKeys Primary key(s) of the entity
   * @param {object} data Data to update
   * @param {PersonItem} currentUser Current user object
   * @param {string[]} relations Relations to populate
   * @returns {Promise<object>} The updated entity
   */
  async update(
    entityHandle: string,
    primaryKeys: Record<string, any>,
    data: { createdAt?: Date; updatedAt?: Date; [key: string]: any },
    currentUser: PersonItem,
    relations: string[] = [],
  ): Promise<object> {
    const entityClass = this.getEntityClass(entityHandle);
    const entity = await this.em.findOne(EntityItem, { handle: entityHandle });
    const template = this.templateService.getEntityTemplate(entityHandle);
    const populate = this.buildPopulate(relations, template);
    let newData: object;

    const item = await this.em.findOne(entityClass, primaryKeys, {
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
          delete (data as Record<string, any>)[field.name];
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

    try {
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

    const populatedItem = await this.em.findOne(entityClass, primaryKeys, {
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
          newData = this.em.assign(item, newData);
          await this.em.flush();
          break;
      }
    }
    return newData;
  }

  // #endregion

  // #region Delete
  /**
   * Deletes an entry by its primary keys, applies security, and runs before/after scripts.
   * @param {string} entityHandle Name of the entity
   * @param {Record<string, any>} primaryKeys Primary key(s) of the entity
   * @param {PersonItem} currentUser Current user object
   * @returns {Promise<void>} No return value
   */
  async delete(
    entityHandle: string,
    primaryKeys: Record<string, any>,
    currentUser: PersonItem,
  ): Promise<void> {
    const entityClass = this.getEntityClass(entityHandle);
    let item = await this.em.findOne(entityClass, primaryKeys);
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

    const populatedItem = await this.em.findOne(entityClass, primaryKeys, {
      populate: this.buildPopulate(['*'], template) as any[],
    });

    try {
      await this.em.remove(item).flush();
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
   * @param {Record<string, any>} entityPrimaryKeys Primary keys of the entity
   * @param {Record<string, any>} referencePrimaryKeys Primary keys of the reference
   * @param {PersonItem} currentUser Current user object
   * @returns {Promise<object>} Result of reference creation
   */
  async createReference(
    entityHandle: string,
    referenceName: string,
    entityPrimaryKeys: Record<string, any>,
    referencePrimaryKeys: Record<string, any>,
    currentUser: PersonItem,
  ): Promise<object> {
    const entityClass = this.getEntityClass(entityHandle);
    const template = this.templateService.getEntityTemplate(entityHandle);
    const name = template.find((x) => x.name == referenceName);
    const item = await this.em.findOne(entityClass, entityPrimaryKeys);

    if (!item || !name) {
      throw new NotFoundException(`global.entityNotFound`);
    }

    const referenceClass = this.getEntityClass(name.referenceName);
    const ref = this.em.getReference(referenceClass, referencePrimaryKeys);

    if (!ref) {
      throw new NotFoundException(`global.referenceNotFound`);
    }

    this.checkTopLevelPermission(
      entityHandle,
      item,
      currentUser,
      'allowUpdateStage',
    );

    await item[name.name].init({ where: referencePrimaryKeys });
    item[name.name].add(ref);

    await this.em.flush();
    return item;
  }

  /**
   * Removes references from an n:m relation without overwriting the entire relation.
   * @param {string} entityHandle Name of the entity
   * @param {string} referenceName Name of the reference relation
   * @param {Record<string, any>} entityPrimaryKeys Primary keys of the entity
   * @param {Record<string, any>} referencePrimaryKeys Primary keys of the reference
   * @param {PersonItem} currentUser Current user object
   * @returns {Promise<object>} Result of reference deletion
   */
  async deleteReference(
    entityHandle: string,
    referenceName: string,
    entityPrimaryKeys: Record<string, any>,
    referencePrimaryKeys: Record<string, any>,
    currentUser: PersonItem,
  ): Promise<object> {
    const entityClass = this.getEntityClass(entityHandle);
    const template = this.templateService.getEntityTemplate(entityHandle);
    const name = template.find((x) => x.name == referenceName);
    const item = await this.em.findOne(entityClass, entityPrimaryKeys);

    if (!item || !name) {
      throw new NotFoundException(`global.entityNotFound`);
    }

    const referenceClass = this.getEntityClass(name.referenceName);
    const ref = this.em.getReference(referenceClass, referencePrimaryKeys);

    if (!ref) {
      throw new NotFoundException(`global.referenceNotFound`);
    }

    this.checkTopLevelPermission(
      entityHandle,
      item,
      currentUser,
      'allowUpdateStage',
    );
    await item[name.name].init({ where: referencePrimaryKeys });
    item[name.name].remove(ref);
    await this.em.flush();
    return item;
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
      if (
        personField in data &&
        (data[personField] === currentUser.handle || data[personField] == null)
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
      if (
        companyField in data &&
        (data[companyField] === currentUser.company?.handle || data[companyField] == null)
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
    // Get all entity permissions for the user
    const allPermissions =
      this.currentService.getAllEntityPermissions(currentUser);
    // Collect handles for entities where allowRead=true
    const allowedEntityHandles = allPermissions
      .filter((perm) => perm.allowRead && perm.entityHandle)
      .map((perm) => perm.entityHandle);

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
    if (!template || !items || items.length === 0) return items;
    const entityClass = entityMap[entityHandle] as { prototype: object };
    const securityFields = template
      .map((x) => x.name)
      .filter(
        (fieldName) =>
          entityClass &&
          typeof entityClass.prototype === 'object' &&
          hasSaplingOption(entityClass.prototype, fieldName, 'isSecurity'),
      );
    if (securityFields.length === 0) return items;
    return items.map((item) => {
      securityFields.forEach((field) => {
        if (field in item) {
          item[field] = undefined;
        }
      });
      return item;
    });
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
      const namedRefs: string[] = template
        .filter((x) => !!x.isReference && relations.includes(x.name))
        .map((x) => x.name);
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
          const value: unknown = (data as Record<string, any>)[field.name];
          let isHandled = false;

          switch (field.kind) {
            case 'm:1':
            case '1:1':
              if (value !== null) {
                if (typeof value === 'object') {
                  // value is a single object
                  if (field.referencedPks.length === 1) {
                    (data as Record<string, any>)[field.name] =
                      value[field.referencedPks[0]];
                  } else {
                    (data as Record<string, any>)[field.name] = [
                      ...field.referencedPks.map((x) => value[x]),
                    ];
                  }
                }
                isHandled = true;
              }
              break;
            case '1:m':
            case 'm:n':
            case 'n:m':
              if (
                value !== null &&
                typeof value === 'object' &&
                Array.isArray(value)
              ) {
                // value is an array of objects
                const arr = value;
                if (
                  arr.every(
                    (el) =>
                      el !== null &&
                      typeof el === 'object' &&
                      !Array.isArray(el),
                  )
                ) {
                  if (field.referencedPks.length === 1) {
                    (data as Record<string, any>)[field.name] = arr.map(
                      (el) => el[field.referencedPks[0]],
                    );
                  } else {
                    (data as Record<string, any>)[field.name] = arr.map((el) =>
                      field.referencedPks.map((x) => el[x]),
                    );
                  }
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

  /**
   * Filters out $like/$or conditions on non-string fields.
   * @param {object} obj Filter object
   * @param {string[]} stringFields List of string field names
   * @returns {object} Filtered object
   */
  private filterNonStringLike(obj: object, stringFields: string[]): object {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.filterNonStringLike(item, stringFields));
    }
    if (typeof obj === 'object' && obj !== null) {
      // Special handling for $or array
      if ('$or' in obj && Array.isArray((obj as any)['$or'])) {
        (obj as any)['$or'] = (obj as any)['$or']
          .map((cond: object) => this.filterNonStringLike(cond, stringFields))
          .filter((cond: object) => Object.keys(cond).length > 0);
      }
      for (const key of Object.keys(obj)) {
        if (
          typeof (obj as any)[key] === 'object' &&
          (obj as any)[key] !== null &&
          '$like' in (obj as any)[key]
        ) {
          if (!stringFields.includes(key)) {
            delete (obj as any)[key];
          }
        }
      }
    }
    return obj;
  }

  /**
   * Converts date strings in the where filter to Date objects.
   * @param {Record<string, any>} obj Filter object
   * @returns {Record<string, any>} Object with date strings converted to Date objects
   */
  private convertDateStrings(
    obj: Record<string, any>,
    template: EntityTemplateDto[] = [],
  ): Record<string, any> {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.convertDateStrings(item, template));
    }

    const dateFields = new Set(
      template
        .filter((field) => ['date', 'datetime', 'DateType'].includes(field.type))
        .map((field) => field.name),
    );

    if (typeof obj === 'object' && obj !== null) {
      for (const key of Object.keys(obj)) {
        const isDateField = dateFields.has(key);
        if (
          typeof obj[key] === 'string' &&
          isDateField &&
          this.isDateFilterValue(obj[key])
        ) {
          obj[key] = new Date(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          // For operators like $gte, $lte
          for (const op of ['$gte', '$lte', '$gt', '$lt', '$eq']) {
            if (
              obj[key][op] &&
              typeof obj[key][op] === 'string' &&
              isDateField &&
              this.isDateFilterValue(obj[key][op])
            ) {
              obj[key][op] = new Date(obj[key][op]);
            }
          }
          obj[key] = this.convertDateStrings(obj[key] as Record<string, any>, template);
        }
      }
    }
    return obj;
  }

  private isDateFilterValue(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isNaN(Date.parse(value));
  }
  // #endregion
}
