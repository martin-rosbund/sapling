import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager, RequiredEntityData } from '@mikro-orm/core';
import { EntityItem } from '../../entity/EntityItem';
import { PersonItem } from '../../entity/PersonItem';
import type { ScriptServerContext } from '../../script/core/script.interface';
import { ScriptResultServerMethods } from '../../script/core/script.result.server';
import { ScriptMethods, ScriptService } from '../script/script.service';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';
import { GenericFilterService } from './generic-filter.service';

@Injectable()
export class GenericMutationService {
  constructor(
    private readonly em: EntityManager,
    private readonly scriptService: ScriptService,
    private readonly genericFilterService: GenericFilterService,
  ) {}

  async applyBeforeScript<T extends Record<string, any>>(
    method: ScriptMethods,
    data: T,
    entity: EntityItem | null,
    currentUser: PersonItem,
    context: ScriptServerContext = {},
  ): Promise<T> {
    if (!entity) {
      return data;
    }

    const script = await this.scriptService.runServer(
      method,
      data,
      entity,
      currentUser,
      context,
    );

    if (script.method === ScriptResultServerMethods.overwrite) {
      return script.items[0] as T;
    }

    return data;
  }

  async applyAfterScript<T extends object>(
    method: ScriptMethods,
    data: T,
    entity: EntityItem | null,
    currentUser: PersonItem,
  ): Promise<T> {
    if (!entity) {
      return data;
    }

    const script = await this.scriptService.runServer(
      method,
      data,
      entity,
      currentUser,
    );

    if (script.method === ScriptResultServerMethods.overwrite) {
      return script.items[0] as T;
    }

    return data;
  }

  async createAndFlush<T extends Record<string, any>>(
    entityHandle: string,
    entityClass: unknown,
    data: T,
    template: EntityTemplateDto[] = [],
  ): Promise<object> {
    return this.runPersistence(entityHandle, async () => {
      const normalizedData = this.genericFilterService.normalizeDatePayload(
        data,
        template,
      );
      const created = this.em.create(
        entityClass as never,
        normalizedData as RequiredEntityData<object>,
      );
      await this.em.flush();
      return created;
    });
  }

  async assignAndFlush<T extends Record<string, any>>(
    entityHandle: string,
    item: object,
    data: T,
    template: EntityTemplateDto[] = [],
  ): Promise<object> {
    return this.runPersistence(entityHandle, async () => {
      const normalizedData = this.genericFilterService.normalizeDatePayload(
        data,
        template,
      );
      const updated = this.em.assign(item, normalizedData as never);
      await this.em.flush();
      return updated;
    });
  }

  async deleteAndFlush<T extends object>(
    entityHandle: string,
    entityClass: unknown,
    where: object,
  ): Promise<number> {
    return this.runPersistence(entityHandle, async () =>
      this.em.nativeDelete(entityClass as never, where as never),
    );
  }

  private async runPersistence<T>(
    entityHandle: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
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
  }
}
