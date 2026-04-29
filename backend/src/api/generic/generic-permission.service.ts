import { ForbiddenException, Injectable } from '@nestjs/common';
import { hasSaplingOption } from '../../entity/global/entity.decorator';
import { ENTITY_MAP } from '../../entity/global/entity.registry';
import { PersonItem } from '../../entity/PersonItem';
import { CurrentService } from '../current/current.service';
import { TemplateService } from '../template/template.service';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';

const entityMap = ENTITY_MAP;

@Injectable()
export class GenericPermissionService {
  constructor(
    private readonly currentService: CurrentService,
    private readonly templateService: TemplateService,
  ) {}

  checkTopLevelPermission(
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

    if (permission[stage] === 'global') {
      return;
    }

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

  setTopLevelFilter(
    where: object,
    currentUser: PersonItem,
    entityHandle: string,
  ): object {
    const permission = this.currentService.getEntityPermissions(
      currentUser,
      entityHandle,
    );

    let nextWhere = this.setEntityLevelFilter(where, currentUser, entityHandle);
    if (permission.allowReadStage === 'global') {
      return nextWhere;
    }

    const template = this.templateService.getEntityTemplate(entityHandle);
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

    switch (permission.allowReadStage) {
      case 'person':
        nextWhere = this.applyPersonFields(
          nextWhere,
          personFields,
          currentUser,
        );
        nextWhere = this.applyCompanyFields(
          nextWhere,
          companyFields,
          currentUser,
        );
        break;
      case 'company':
        nextWhere = this.applyCompanyFields(
          nextWhere,
          companyFields,
          currentUser,
        );
        break;
    }

    return nextWhere;
  }

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

    if (where && Object.keys(where).length > 0) {
      return { $and: [where, entityFilter] };
    }

    return entityFilter;
  }

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
      } else if (Object.keys(where).length > 0) {
        where = { $and: [where, { $or: orCondition }] };
      } else {
        where = { $or: orCondition };
      }
    }

    return where;
  }

  private getAllowedEntityHandles(currentUser: PersonItem): string[] {
    return this.currentService
      .getAllEntityPermissions(currentUser)
      .flatMap((perm) =>
        perm.allowRead && perm.entityHandle ? [perm.entityHandle] : [],
      );
  }

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
      }

      return { ...where, [personField]: currentUser.handle };
    }

    const orConditions = personFields.map((personField) => ({
      [personField]: currentUser.handle,
    }));

    if (where && Object.keys(where).length > 0) {
      return { $and: [where, { $or: orConditions }] };
    }

    return { $or: orConditions };
  }

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
      }

      return { ...where, [companyField]: currentUser.company?.handle };
    }

    const orConditions = companyFields.map((companyField) => ({
      [companyField]: currentUser.company?.handle,
    }));

    if (where && Object.keys(where).length > 0) {
      return { $and: [where, { $or: orConditions }] };
    }

    return { $or: orConditions };
  }

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
}
