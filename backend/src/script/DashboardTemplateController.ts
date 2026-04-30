import type { EntityManager } from '@mikro-orm/core';
import { EntityItem } from '../entity/EntityItem.js';
import { PersonItem } from '../entity/PersonItem.js';
import { ScriptClass } from './core/script.class.js';
import {
  ScriptResultServer,
  ScriptResultServerMethods,
} from './core/script.result.server.js';
import { DashboardTemplateItem } from '../entity/DashboardTemplateItem.js';

/**
 * Restricts dashboard template visibility to global templates plus the current
 * user's private templates and stamps new templates with the active user.
 */
export class DashboardTemplateController extends ScriptClass {
  constructor(entity: EntityItem, user: PersonItem, em?: EntityManager) {
    super(entity, user, em);
  }

  beforeRead(items: object[]): Promise<ScriptResultServer> {
    const preparedItems = items.map((item) =>
      this.withVisibilityScope(item as Record<string, unknown>),
    );

    return new ScriptResultServer(
      preparedItems,
      ScriptResultServerMethods.overwrite,
    );
  }

  beforeInsert(items: DashboardTemplateItem[]): Promise<ScriptResultServer> {
    const preparedItems = items.map((item) => ({
      ...item,
      person: this.user.handle,
      isShared: this.normalizeSharedValue(item.isShared),
    }));

    return new ScriptResultServer(
      preparedItems,
      ScriptResultServerMethods.overwrite,
    );
  }

  private withVisibilityScope(where: Record<string, unknown>) {
    const visibilityFilter = {
      $or: [{ isShared: true }, { person: this.user.handle }],
    };

    if (!where || Object.keys(where).length === 0) {
      return visibilityFilter;
    }

    return {
      $and: [where, visibilityFilter],
    };
  }

  private normalizeSharedValue(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
    }

    if (typeof value === 'number') {
      return value === 1;
    }

    return false;
  }
}
