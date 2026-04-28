import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { PersonItem } from '../../entity/PersonItem';
import { GenericPermissionService } from './generic-permission.service';
import { GenericQueryService } from './generic-query.service';
import { TemplateService } from '../template/template.service';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';

@Injectable()
export class GenericReferenceService {
  constructor(
    private readonly em: EntityManager,
    private readonly templateService: TemplateService,
    private readonly genericPermissionService: GenericPermissionService,
    private readonly genericQueryService: GenericQueryService,
  ) {}

  getHandleFilter(
    entityHandle: string,
    handle: string | number,
  ): { handle: string | number } {
    return { handle: this.normalizeHandleValue(entityHandle, handle) };
  }

  normalizeHandleValue(
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

  reduceReferenceFields(
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
                const arr = value;
                if (field.referencedPks.length === 1) {
                  (data as Record<string, unknown>)[field.name] = arr.map(
                    (entry) =>
                      this.getReferencedValue(entry, field.referencedPks[0]),
                  );
                } else {
                  (data as Record<string, unknown>)[field.name] = arr.map(
                    (entry) =>
                      this.getReferencedValues(entry, field.referencedPks),
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

  async validateReferenceDependencies(
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

    await Promise.all(
      dependencyFields.map(async (field) => {
        const dependency = field.referenceDependency;
        if (!dependency) {
          return;
        }

        const childValue = this.extractComparableDependencyValue(
          data[field.name],
        );
        if (childValue == null) {
          return;
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

          return;
        }

        const referenceEntityHandle = field.referenceName ?? '';
        const childHandle = this.normalizeHandleValue(
          referenceEntityHandle,
          childValue,
        );
        const childFilter = this.genericPermissionService.setTopLevelFilter(
          this.getHandleFilter(referenceEntityHandle, childHandle),
          currentUser,
          referenceEntityHandle,
        );
        const referenceClass =
          this.genericQueryService.getEntityClass(referenceEntityHandle);
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
      }),
    );
  }

  getRelationCollection(
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
}
