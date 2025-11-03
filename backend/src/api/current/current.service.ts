import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { PersonItem } from 'src/entity/PersonItem';
import { TicketItem } from 'src/entity/TicketItem';
import { EventItem } from 'src/entity/EventItem';
import { ENTITY_NAMES } from '../../entity/global/entity.registry';
import { WorkHourWeekItem } from 'src/entity/WorkHourWeekItem';
import {
  AccumulatedPermissionDto,
  AccumulatedPermissionBufferDto,
} from './dto/accumulated-permission.dto';

// Service for current user operations (e.g., password change)
@Injectable()
export class CurrentService {
  /**
   * Injects the MikroORM EntityManager for database access.
   * @param em - EntityManager instance
   */
  constructor(private readonly em: EntityManager) {}

  /**
   * Changes the password for the given user.
   * @param user - The user whose password is to be changed
   * @param newPassword - The new password
   */
  async changePassword(user: PersonItem, newPassword: string): Promise<void> {
    const entity = await this.em.findOne(PersonItem, { handle: user.handle });

    if (entity) {
      this.em.assign(entity, { loginPassword: newPassword, requirePasswordChange: false }); // Update the entity in the database
      await this.em.flush();
    }
    return;
  }

  async getOpenTickets(user: PersonItem): Promise<TicketItem[]> {
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const items = await this.em.find(TicketItem, {
      assignee: { handle: user?.handle },
      status: { handle: { $nin: ['closed'] } },
      deadlineDate: { $lte: todayEnd },
    });
    return items || [];
  }

  async getOpenEvents(user: PersonItem): Promise<EventItem[]> {
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const items = await this.em.find(EventItem, {
      participants: { handle: user?.handle },
      status: { handle: { $nin: ['canceled', 'completed'] } },
      startDate: { $lte: todayEnd },
    });
    return items || [];
  }

  async countOpenTasks(user: PersonItem): Promise<{ count: number }> {
    let count = 0;
    count += (await this.getOpenEvents(user)).length;
    count += (await this.getOpenTickets(user)).length;

    return { count: count };
  }

  /**
   * Aggregates permissions for a person and entityName, prioritizing stages and boolean values.
   */
  getEntityPermissions(
    person: PersonItem,
    entityName: string,
  ): AccumulatedPermissionDto {
    // Dynamisch alle Stages aus den Rollen der Person sammeln und nach Priorität sortieren
    const stageOrder: string[] = Array.from(
      new Set(
        person?.roles
          .map((role) => role.stage?.handle)
          .filter((handle): handle is string => !!handle),
      ),
    );

    const result = new AccumulatedPermissionDto();
    result.entityName = entityName;
    const permissions: AccumulatedPermissionBufferDto[] = [];

    for (const role of person?.roles || []) {
      const stage = role.stage?.handle || '';
      for (const perm of role.permissions) {
        if (perm.entity?.handle === entityName) {
          const buffer = new AccumulatedPermissionBufferDto();
          buffer.stage = stage;
          buffer.allowDelete = !!perm.allowDelete;
          buffer.allowRead = !!perm.allowRead;
          buffer.allowInsert = !!perm.allowInsert;
          buffer.allowUpdate = !!perm.allowUpdate;
          buffer.allowShow = !!perm.allowShow;
          permissions.push(buffer);
        }
      }
    }

    const del = this.getBestPermission('allowDelete', permissions, stageOrder);
    result.allowDelete = del.value;
    result.allowDeleteStage = del.stage;

    const read = this.getBestPermission('allowRead', permissions, stageOrder);
    result.allowRead = read.value;
    result.allowReadStage = read.stage;

    const create = this.getBestPermission(
      'allowInsert',
      permissions,
      stageOrder,
    );
    result.allowInsert = create.value;
    result.allowInsertStage = create.stage;

    const update = this.getBestPermission(
      'allowUpdate',
      permissions,
      stageOrder,
    );
    result.allowUpdate = update.value;
    result.allowUpdateStage = update.stage;

    const show = this.getBestPermission('allowShow', permissions, stageOrder);
    result.allowShow = show.value;
    result.allowShowStage = show.stage;

    return result;
  }

  /**
   * Returns the best permission value and stage for a given key, permissions and stage order.
   */
  private getBestPermission(
    key:
      | 'allowDelete'
      | 'allowShow'
      | 'allowInsert'
      | 'allowUpdate'
      | 'allowRead',
    permissions: AccumulatedPermissionBufferDto[],
    stageOrder: string[],
  ): { value: boolean; stage: string } {
    for (const stage of stageOrder) {
      const found = permissions.find((p) => p.stage === stage && p[key]);
      if (found) return { value: true, stage };
    }
    for (const stage of stageOrder) {
      const found = permissions.find((p) => p.stage === stage);
      if (found) return { value: false, stage };
    }
    return { value: false, stage: '' };
  }

  /**
   * Returns all entity permissions for a given person.
   */
  getAllEntityPermissions(person: PersonItem): AccumulatedPermissionDto[] {
    return ENTITY_NAMES.map((entityName) =>
      this.getEntityPermissions(person, entityName),
    );
  }

  /**
   * Returns the work time for a given person.
   */
  async getWorkWeek(person: PersonItem): Promise<WorkHourWeekItem | null> {
    if (person.workWeek) {
      const workWeekHandle =
        typeof person.workWeek === 'object'
          ? person.workWeek.handle
          : person.workWeek;
      return await this.em.findOne(
        WorkHourWeekItem,
        { handle: workWeekHandle },
        {
          populate: [
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
          ],
        },
      );
    } else if (person.company && person.company.workWeek) {
      const companyWorkWeekHandle =
        typeof person.company.workWeek === 'object'
          ? person.company.workWeek.handle
          : person.company.workWeek;
      return await this.em.findOne(
        WorkHourWeekItem,
        { handle: companyWorkWeekHandle },
        {
          populate: [
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
          ],
        },
      );
    }
    return null;
  }
}
