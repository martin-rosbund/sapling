import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { PersonItem } from '../../entity/PersonItem';
import { TemplateService } from '../template/template.service';
import { GenericPermissionService } from './generic-permission.service';
import { GenericQueryService } from './generic-query.service';
import { GenericReferenceService } from './generic-reference.service';
import { GenericSanitizerService } from './generic-sanitizer.service';

@Injectable()
export class GenericRelationService {
  constructor(
    private readonly em: EntityManager,
    private readonly templateService: TemplateService,
    private readonly genericPermissionService: GenericPermissionService,
    private readonly genericQueryService: GenericQueryService,
    private readonly genericReferenceService: GenericReferenceService,
    private readonly genericSanitizerService: GenericSanitizerService,
  ) {}

  async createReference(
    entityHandle: string,
    referenceName: string,
    entityHandleValue: string | number,
    referenceHandleValue: string | number,
    currentUser: PersonItem,
  ): Promise<object> {
    const context = await this.addReferenceAndFlush(
      entityHandle,
      referenceName,
      entityHandleValue,
      referenceHandleValue,
      currentUser,
    );

    return this.genericSanitizerService.sanitizeEntityResult(
      entityHandle,
      context.item,
      context.template,
    );
  }

  async deleteReference(
    entityHandle: string,
    referenceName: string,
    entityHandleValue: string | number,
    referenceHandleValue: string | number,
    currentUser: PersonItem,
  ): Promise<object> {
    const context = await this.deleteReferenceAndFlush(
      entityHandle,
      referenceName,
      entityHandleValue,
      referenceHandleValue,
      currentUser,
    );

    return this.genericSanitizerService.sanitizeEntityResult(
      entityHandle,
      context.item,
      context.template,
    );
  }

  async addReferenceAndFlush(
    entityHandle: string,
    referenceName: string,
    entityHandleValue: string | number,
    referenceHandleValue: string | number,
    currentUser: PersonItem,
  ): Promise<{
    item: Record<string, unknown>;
    referenceItem: object;
    template: ReturnType<TemplateService['getEntityTemplate']>;
  }> {
    const context = await this.resolveReferenceContext(
      entityHandle,
      referenceName,
      entityHandleValue,
      referenceHandleValue,
      currentUser,
    );

    await context.relation.init({
      where: this.genericReferenceService.getHandleFilter(
        context.referenceEntityHandle,
        context.referenceHandle,
      ),
    });
    context.relation.add(context.referenceItem);
    await this.em.flush();

    return {
      item: context.item,
      referenceItem: context.referenceItem,
      template: context.template,
    };
  }

  async deleteReferenceAndFlush(
    entityHandle: string,
    referenceName: string,
    entityHandleValue: string | number,
    referenceHandleValue: string | number,
    currentUser: PersonItem,
  ): Promise<{
    item: Record<string, unknown>;
    referenceItem: object;
    template: ReturnType<TemplateService['getEntityTemplate']>;
  }> {
    const context = await this.resolveReferenceContext(
      entityHandle,
      referenceName,
      entityHandleValue,
      referenceHandleValue,
      currentUser,
    );

    await context.relation.init({
      where: this.genericReferenceService.getHandleFilter(
        context.referenceEntityHandle,
        context.referenceHandle,
      ),
    });
    context.relation.remove(context.referenceItem);
    await this.em.flush();

    return {
      item: context.item,
      referenceItem: context.referenceItem,
      template: context.template,
    };
  }

  private async resolveReferenceContext(
    entityHandle: string,
    referenceName: string,
    entityHandleValue: string | number,
    referenceHandleValue: string | number,
    currentUser: PersonItem,
  ): Promise<{
    item: Record<string, unknown>;
    relation: {
      init: (options: {
        where: { handle: string | number };
      }) => Promise<unknown>;
      add: (value: object) => void;
      remove: (value: object) => void;
    };
    referenceEntityHandle: string;
    referenceHandle: string | number;
    referenceItem: object;
    template: ReturnType<TemplateService['getEntityTemplate']>;
  }> {
    const entityClass = this.genericQueryService.getEntityClass(entityHandle);
    const template = this.templateService.getEntityTemplate(entityHandle);
    const field = template.find((entry) => entry.name === referenceName);
    const item = await this.em.findOne(
      entityClass,
      this.genericReferenceService.getHandleFilter(
        entityHandle,
        entityHandleValue,
      ),
    );

    if (!item || !field) {
      throw new NotFoundException(`global.entityNotFound`);
    }

    this.genericPermissionService.checkTopLevelPermission(
      entityHandle,
      item,
      currentUser,
      'allowUpdateStage',
    );

    const referenceEntityHandle = field.referenceName;
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
    const referenceItem = await this.em.findOne(
      referenceClass,
      referenceFilter,
    );

    if (!referenceItem) {
      throw new NotFoundException(`global.referenceNotFound`);
    }

    const relation = this.genericReferenceService.getRelationCollection(
      item,
      field.name,
    );

    return {
      item: item,
      relation,
      referenceEntityHandle,
      referenceHandle,
      referenceItem,
      template,
    };
  }
}
