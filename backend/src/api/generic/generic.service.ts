import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager, RequiredEntityData, EntityName } from '@mikro-orm/core';
import { ENTITY_MAP } from '../../entity/global/entity.registry';
import { getSaplingMetadata } from '../../entity/global/entity.decorator';
import { TemplateService } from '../template/template.service';
import { ScriptClass, ScriptMethods } from 'src/script/core/script.class';
import { EntityItem } from 'src/entity/EntityItem';
import { PersonItem } from 'src/entity/PersonItem';
import { CurrentService } from '../current/current.service';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';
import { performance } from 'perf_hooks';

// #region Entity Map
// Mapping of entity names to classes
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
  ) {}
  // #endregion

  // #region Find / Count
  /**
   * Retrieves a paginated list of entities, applies security, and runs before/after scripts.
   */
  async findAndCount(
    entityName: string,
    where: object,
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

    if (entity) {
      // Run script before read
      const script = await ScriptClass.runServer(
        ScriptMethods.beforeRead,
        where,
        entity,
        currentUser,
      );
      where = script.items;
    }

    where = this.setTopLevelFilter(where, currentUser, entityName);

    const result = await this.em.findAndCount(entityClass, where, {
      limit,
      offset,
      orderBy,
      populate: populate as any[],
    });
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
      const script = await ScriptClass.runServer(
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

  // #region Create
  /**
   * Creates a new entry for an entity, applies security, and runs before/after scripts.
   */
  async create(
    entityName: string,
    data: { createdAt?: Date; updatedAt?: Date; [key: string]: any },
    currentUser: PersonItem,
  ): Promise<object> {
    delete data.createdAt;
    delete data.updatedAt;

    this.checkTopLevelPermission(
      entityName,
      data,
      currentUser,
      'allowInsertStage',
    );

    const template = this.templateService.getEntityTemplate(entityName);
    const entity = await this.em.findOne(EntityItem, { handle: entityName });

    if (template) {
      for (const field of template) {
        // Remove auto-increment fields
        if (field.isAutoIncrement) {
          delete (data as Record<string, any>)[field.name];
        }
        // Reduce reference fields to primary key
        if (
          field.isReference &&
          (data as Record<string, any>)[field.name] &&
          typeof (data as Record<string, any>)[field.name] === 'object' &&
          field.referenceName
        ) {
          const subTemplate = this.templateService.getEntityTemplate(
            field.referenceName,
          );
          const pkField = subTemplate?.find((x) => x.isPrimaryKey);
          if (
            pkField &&
            pkField.name &&
            (data as Record<string, any>)[field.name]
          ) {
            const fieldData = (data as Record<string, unknown>)[field.name];
            if (
              fieldData &&
              typeof fieldData === 'object' &&
              pkField.name in fieldData
            ) {
              (data as Record<string, any>)[field.name] = fieldData[
                pkField.name
              ] as string | number | boolean | null | undefined;
            }
          }
        }
      }
    }

    if (entity) {
      // Run script before insert
      const script = await ScriptClass.runServer(
        ScriptMethods.beforeInsert,
        data,
        entity,
        currentUser,
      );
      data = script.items[0];
    }

    const entityClass = this.getEntityClass(entityName);
    // MikroORM expects entityClass as EntityName<T>, so cast to unknown then object
    let newItem = this.em.create(
      entityClass,
      data as RequiredEntityData<object>,
    );
    await this.em.flush();

    if (entity) {
      // Run script after insert
      const script = await ScriptClass.runServer(
        ScriptMethods.afterInsert,
        newItem,
        entity,
        currentUser,
      );
      newItem = script.items[0];
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
    delete data.createdAt;
    delete data.updatedAt;

    const entityClass = this.getEntityClass(entityName);
    const entity = await this.em.findOne(EntityItem, { handle: entityName });
    const template = this.templateService.getEntityTemplate(entityName);
    const populate = this.buildPopulate(relations, template);

    const item = await this.em.findOne(entityClass, primaryKeys, {
      populate: populate as any[],
    });

    if (!item) {
      throw new NotFoundException(`global.updateError`);
    }

    this.checkTopLevelPermission(
      entityName,
      { ...item, ...data },
      currentUser,
      'allowUpdateStage',
    );

    if (entity) {
      // Run script before update
      const script = await ScriptClass.runServer(
        ScriptMethods.beforeUpdate,
        data,
        entity,
        currentUser,
      );
      data = script.items[0];
    }

    // Entferne alle m:n Relations aus data, die nicht in relations übergeben wurden
    if (template) {
      for (const field of template.filter((x) => x.kind === 'm:n')) {
        if (field.isReference && !relations.includes(field.name)) {
          delete (data as Record<string, any>)[field.name];
        }
      }
    }

    this.em.assign(item, data);
    await this.em.flush();

    if (entity) {
      // Run script after update
      const script = await ScriptClass.runServer(
        ScriptMethods.afterUpdate,
        data,
        entity,
        currentUser,
      );
      data = script.items[0];
    }
    return item;
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

    if (!item) {
      throw new NotFoundException(`global.deleteError`);
    }
    this.checkTopLevelPermission(
      entityName,
      item,
      currentUser,
      'allowDeleteStage',
    );

    if (entity) {
      // Run script before delete
      const script = await ScriptClass.runServer(
        ScriptMethods.beforeDelete,
        item,
        entity,
        currentUser,
      );
      item = script.items[0];
    }

    await this.em.remove(item).flush();

    if (entity) {
      // Run script after delete
      const script = await ScriptClass.runServer(
        ScriptMethods.afterDelete,
        item,
        entity,
        currentUser,
      );
      item = script.items[0];
    }
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
   * Returns all field names that have isCompany or isPerson set in SaplingMetadata.
   * @param entityName Name of the entity
   * @param template EntityTemplate[]
   * @param type 'isCompany' | 'isPerson'
   */
  private getSpecialFields(
    entityName: string,
    template: EntityTemplateDto[],
    type: 'isCompany' | 'isPerson',
  ): string[] {
    if (!template) return [];
    const entityClass = entityMap[entityName] as { prototype: object };
    return template
      .map((x) => x.name)
      .filter(
        (fieldName) =>
          entityClass &&
          typeof entityClass.prototype === 'object' &&
          getSaplingMetadata(entityClass.prototype, fieldName)?.[type] === true,
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
          getSaplingMetadata(entityClass.prototype, fieldName)?.isSecurity ===
            true,
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
  // #endregion
}
