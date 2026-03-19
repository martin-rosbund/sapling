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

@Injectable()
export class GenericService {
  // #region Constructor
  /**
   * Service constructor with dependency injection.
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
   */
  async findAndCount(
    entityName: string,
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
    const entityClass = this.getEntityClass(entityName);
    const offset = (page - 1) * limit;
    const template = this.templateService.getEntityTemplate(entityName);
    const entity = await this.em.findOne(EntityItem, { handle: entityName });
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
      this.setTopLevelFilter(where, currentUser, entityName),
      stringFields,
    );

    // Datumsstrings im where-Filter zu Date-Objekten konvertieren
    where = this.convertDateStrings(where);

    try {
      result = await this.em.findAndCount(entityClass, where, {
        limit,
        offset,
        orderBy,
        populate: populate as any[],
      });
    } catch (error) {
      global.log.error(`entity ${entityName}:`, error);
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
    items = this.removeSecurityFields(entityName, template, items);

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
   */
  async downloadJSON(
    entityName: string,
    where: object = {},
    orderBy: object = {},
    currentUser: PersonItem,
    relations: string[] = [],
  ): Promise<string> {
    const entityClass = this.getEntityClass(entityName);
    const template = this.templateService.getEntityTemplate(entityName);
    const populate = this.buildPopulate(relations, template);
    let result: object[];

    // Security filter
    const stringFields = template
      ? template.filter((f) => f.type === 'string').map((f) => f.name)
      : [];

    where = this.filterNonStringLike(
      this.setTopLevelFilter(where, currentUser, entityName),
      stringFields,
    );

    where = this.convertDateStrings(where);

    try {
      result = await this.em.find(entityClass, where, {
        orderBy,
        populate: populate as any[],
      });
    } catch (error) {
      global.log.error(`entity ${entityName}:`, error);
      if (error instanceof Error) {
        throw new BadRequestException(
          `global.${error.name.charAt(0).toLowerCase() + error.name.slice(1)}`,
          error.message,
        );
      }
      throw error;
    }

    // Remove security fields
    result = this.removeSecurityFields(entityName, template, result);

    // Convert to JSON
    return JSON.stringify(result, null, 2);
  }
  // #endregion

  // #region Create
  /**
   * Creates a new entry for an entity, applies security, and runs before/after scripts.
   */
  async create(
    entityName: string,
    data: { createdAt?: Date; updatedAt?: Date; [key: string]: any },
    currentUser: PersonItem,
  ): Promise<object> {
    this.checkTopLevelPermission(
      entityName,
      data,
      currentUser,
      'allowInsertStage',
    );

    const template = this.templateService.getEntityTemplate(entityName);
    const entity = await this.em.findOne(EntityItem, { handle: entityName });
    let newItem: object;

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

    const entityClass = this.getEntityClass(entityName);

    try {
      newItem = this.em.create(entityClass, data as RequiredEntityData<object>);
      await this.em.flush();
    } catch (error) {
      global.log.error(`entity ${entityName}:`, error);
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
      newItem,
    );

    const populatedItem = await this.em.findOne(entityClass, primaryKeys, {
      populate: this.buildPopulate(['*'], template) as any[],
    });

    if (entity) {
      // Run script after insert
      const script = await this.scriptService.runServer(
        ScriptMethods.afterInsert,
        populatedItem || newItem,
        entity,
        currentUser,
      );

      switch (script.method) {
        case ScriptResultServerMethods.overwrite:
          newItem = script.items[0];
          break;
      }
    }
    return newItem;
  }

  // #endregion

  // #region Update
  /**
   * Updates an entry by its primary keys, applies security, and runs before/after scripts.
   */
  async update(
    entityName: string,
    primaryKeys: Record<string, any>,
    data: { createdAt?: Date; updatedAt?: Date; [key: string]: any },
    currentUser: PersonItem,
    relations: string[] = [],
  ): Promise<object> {
    const entityClass = this.getEntityClass(entityName);
    const entity = await this.em.findOne(EntityItem, { handle: entityName });
    const template = this.templateService.getEntityTemplate(entityName);
    const populate = this.buildPopulate(relations, template);
    let newItem: object;

    const item = await this.em.findOne(entityClass, primaryKeys, {
      populate: populate as any[],
    });

    if (!item) {
      throw new NotFoundException(`global.entityNotFound`);
    }

    this.checkTopLevelPermission(
      entityName,
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
      newItem = this.em.assign(item, data);
      await this.em.flush();
    } catch (error) {
      global.log.error(`entity ${entityName}:`, error);
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

    if (entity && newItem) {
      // Run script after update
      const script = await this.scriptService.runServer(
        ScriptMethods.afterUpdate,
        populatedItem || newItem,
        entity,
        currentUser,
      );

      switch (script.method) {
        case ScriptResultServerMethods.overwrite:
          newItem = script.items[0];
          break;
      }
    }
    return newItem;
  }

  // #endregion

  // #region Delete
  /**
   * Deletes an entry by its primary keys, applies security, and runs before/after scripts.
   */
  async delete(
    entityName: string,
    primaryKeys: Record<string, any>,
    currentUser: PersonItem,
  ): Promise<void> {
    const entityClass = this.getEntityClass(entityName);
    let item = await this.em.findOne(entityClass, primaryKeys);
    const entity = await this.em.findOne(EntityItem, { handle: entityName });
    const template = this.templateService.getEntityTemplate(entityName);

    if (!item) {
      throw new NotFoundException(`global.entityNotFound`);
    }

    this.checkTopLevelPermission(
      entityName,
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
      global.log.error(`entity ${entityName}:`, error);
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
   * Fügt Referenzen zu einer n:m-Relation hinzu, ohne die gesamte Relation zu überschreiben.
   */
  async createReference(
    entityName: string,
    referenceName: string,
    entityPrimaryKeys: Record<string, any>,
    referencePrimaryKeys: Record<string, any>,
    currentUser: PersonItem,
  ): Promise<object> {
    const entityClass = this.getEntityClass(entityName);
    const template = this.templateService.getEntityTemplate(entityName);
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
      entityName,
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
   * Entfernt Referenzen aus einer n:m-Relation, ohne die gesamte Relation zu überschreiben.
   */
  async deleteReference(
    entityName: string,
    referenceName: string,
    entityPrimaryKeys: Record<string, any>,
    referencePrimaryKeys: Record<string, any>,
    currentUser: PersonItem,
  ): Promise<object> {
    const entityClass = this.getEntityClass(entityName);
    const template = this.templateService.getEntityTemplate(entityName);
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
      entityName,
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
   * Prüft, ob die Datenmanipulation (create, update, delete) erlaubt ist.
   * Es muss in allen Feldern mit isCompany und isPerson die eigene company/person stehen.
   */
  private checkTopLevelPermission(
    entityName: string,
    data: Record<string, any>,
    currentUser: PersonItem,
    stage: 'allowInsertStage' | 'allowUpdateStage' | 'allowDeleteStage',
  ): void {
    const template = this.templateService.getEntityTemplate(entityName);
    const permission = this.currentService.getEntityPermissions(
      currentUser,
      entityName,
    );

    if (permission[stage] === 'global') return;

    const companyFields = this.getSpecialFields(
      entityName,
      template,
      'isCompany',
    );

    const personFields = this.getSpecialFields(
      entityName,
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
   * Check, if all personFields in data match the current user's handle.
   */
  private applyPersonManipulation(
    data: Record<string, any>,
    personFields: string[],
    currentUser: PersonItem,
  ) {
    for (const personField of personFields) {
      if (
        !data ||
        !(personField in data) ||
        data[personField] !== currentUser.handle
      ) {
        throw new ForbiddenException('global.permissionDenied');
      }
    }
  }

  /**
   * Check, if all personFields in data match the current user's handle.
   */
  private applyCompanyManipulation(
    data: Record<string, any>,
    companyFields: string[],
    currentUser: PersonItem,
  ) {
    for (const companyField of companyFields) {
      if (
        !data ||
        !(companyField in data) ||
        data[companyField] !== currentUser.handle
      ) {
        throw new ForbiddenException('global.permissionDenied');
      }
    }
  }

  /**
   * Applies top-level security filters to the query based on user permissions.
   * @param where The current filter object
   * @param currentUser The current user
   * @param entityName The entity name
   * @returns The filtered query object
   */
  private setTopLevelFilter(
    where: object,
    currentUser: PersonItem,
    entityName: string,
  ): object {
    const permission = this.currentService.getEntityPermissions(
      currentUser,
      entityName,
    );

    where = this.setEntityLevelFilter(where, currentUser, entityName);
    if (permission.allowReadStage === 'global') return where;

    const companyFields = this.getSpecialFields(
      entityName,
      this.templateService.getEntityTemplate(entityName),
      'isCompany',
    );

    const personFields = this.getSpecialFields(
      entityName,
      this.templateService.getEntityTemplate(entityName),
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
   * Adds entity-level filters based on fields with isEntity=true. The filter allows only entities where the field value is in the list of allowed entity handles for the user, or null.
   */
  private setEntityLevelFilter(
    where: object,
    currentUser: PersonItem,
    entityName: string,
  ): object {
    const entityFields = this.getSpecialFields(
      entityName,
      this.templateService.getEntityTemplate(entityName),
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
      .filter((perm) => perm.allowRead && perm.entityName)
      .map((perm) => perm.entityName);

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
   */
  private applyPersonFields(
    where: object,
    personFields: string[],
    currentUser: PersonItem,
  ): object {
    for (const personField of personFields) {
      if (Array.isArray(where)) {
        where = (where as Record<string, any>[]).map((x) => ({
          ...x,
          [personField]: currentUser.handle,
        }));
      } else {
        where = { ...where, [personField]: currentUser.handle };
      }
    }
    return where;
  }

  /**
   * Adds companyFields filters to the where object for security.
   */
  private applyCompanyFields(
    where: object,
    companyFields: string[],
    currentUser: PersonItem,
  ): object {
    for (const companyField of companyFields) {
      if (Array.isArray(where)) {
        where = (where as Record<string, any>[]).map((x) => ({
          ...x,
          [companyField]: currentUser.company?.handle,
        }));
      } else {
        where = { ...where, [companyField]: currentUser.company?.handle };
      }
    }
    return where;
  }

  /**
   * Returns all field names that have isCompany, isPerson, or isEntity set in SaplingMetadata.
   * @param entityName Name of the entity
   * @param template EntityTemplate[]
   * @param type 'isCompany' | 'isPerson'
   */
  private getSpecialFields(
    entityName: string,
    template: EntityTemplateDto[],
    type: 'isCompany' | 'isPerson' | 'isEntity',
  ): string[] {
    if (!template) return [];
    const entityClass = entityMap[entityName] as { prototype: object };
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
   */
  private removeSecurityFields(
    entityName: string,
    template: EntityTemplateDto[],
    items: object[],
  ): object[] {
    if (!template || !items || items.length === 0) return items;
    const entityClass = entityMap[entityName] as { prototype: object };
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
   * @param entityName The entity name
   */
  private getEntityClass<T = object>(entityName: string): EntityName<T> {
    const entityClass = entityMap[entityName] as EntityName<T> | undefined;
    if (!entityClass) {
      throw new NotFoundException(`global.entityNotFound`);
    }
    return entityClass;
  }

  /**
   * Builds the populate list based on relations and template.
   * @param relations The relations to populate
   * @param template The entity template
   * @returns Array of relation names to populate
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
                  // value ist ein einzelnes Objekt
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
                // value ist ein Array von Objekten
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
   */
  private filterNonStringLike(obj: object, stringFields: string[]): object {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.filterNonStringLike(item, stringFields));
    }
    if (typeof obj === 'object' && obj !== null) {
      // $or-Array speziell behandeln
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
   */
  private convertDateStrings(obj: Record<string, any>): Record<string, any> {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.convertDateStrings(item));
    }
    if (typeof obj === 'object' && obj !== null) {
      for (const key of Object.keys(obj)) {
        // Prüfe, ob key ein Datumsfeld ist (z.B. endet mit '_date' oder enthält 'date')
        if (
          typeof obj[key] === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(obj[key]) &&
          (key.endsWith('_date') || key.includes('date'))
        ) {
          obj[key] = new Date(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          // Für Operatoren wie $gte, $lte
          for (const op of ['$gte', '$lte', '$gt', '$lt', '$eq']) {
            if (
              obj[key][op] &&
              typeof obj[key][op] === 'string' &&
              /^\d{4}-\d{2}-\d{2}$/.test(obj[key][op]) &&
              (key.endsWith('_date') || key.includes('date'))
            ) {
              obj[key][op] = new Date(obj[key][op]);
            }
          }
          obj[key] = this.convertDateStrings(obj[key] as Record<string, any>);
        }
      }
    }
    return obj;
  }
  // #endregion
}
