import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { PersonItem } from '../../entity/PersonItem';
import { TicketItem } from '../../entity/TicketItem';
import { EventItem } from '../../entity/EventItem';
import { ENTITY_HANDLES } from '../../entity/global/entity.registry';
import { WorkHourWeekItem } from '../../entity/WorkHourWeekItem';
import {
  AccumulatedPermissionDto,
  AccumulatedPermissionBufferDto,
} from './dto/accumulated-permission.dto';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Service for current user operations (e.g., password change, tickets, events, permissions, work week)
 *
 * @property        {EntityManager} em   MikroORM EntityManager for database access
 *
 * @method          changePassword(user: PersonItem, newPassword: string): Promise<void>
 *                  Changes the password for the given user.
 * @method          getOpenTickets(user: PersonItem): Promise<TicketItem[]>
 *                  Returns all open tickets assigned to the user.
 * @method          getOpenEvents(user: PersonItem): Promise<EventItem[]>
 *                  Returns all open events assigned to the user.
 * @method          countOpenTasks(user: PersonItem): Promise<{ count: number }>
 *                  Returns the count of open tasks for the user.
 * @method          getEntityPermissions(person: PersonItem, entityHandle: string): AccumulatedPermissionDto
 *                  Aggregates permissions for a person and entityHandle, prioritizing stages and boolean values.
 * @method          getAllEntityPermissions(person: PersonItem): AccumulatedPermissionDto[]
 *                  Returns all entity permissions for a given person.
 * @method          getWorkWeek(person: PersonItem): Promise<WorkHourWeekItem | null>
 *                  Returns the work week configuration for a given person.
 */
@Injectable()
export class CurrentService {
  /**
   * MikroORM EntityManager for database access
   * @type {EntityManager}
   */
  /**
   * Injects the MikroORM EntityManager for database access.
   * @param em EntityManager instance
   */
  constructor(private readonly em: EntityManager) {}

  /**
   * Reloads the current user with the relations needed by the frontend profile flow.
   * @param user The current session user
   * @returns Fully populated PersonItem or null if it no longer exists
   */
  async getPerson(user: PersonItem): Promise<PersonItem | null> {
    if (user.handle == null) {
      return null;
    }

    const person = await this.em.findOne(
      PersonItem,
      { handle: user.handle },
      {
        populate: [
          'company',
          'company.country',
          'type',
          'language',
          'roles',
          'roles.stage',
          'roles.permissions',
          'roles.permissions.entity',
        ],
      },
    );

    delete person?.loginPassword; // Remove password before returning
    return person || null;
  }

  /**
   * Changes the password for the given user.
   * @param user The user whose password is to be changed
   * @param newPassword The new password
   * @returns void
   */
  async changePassword(user: PersonItem, newPassword: string): Promise<void> {
    const entity = await this.em.findOne(PersonItem, { handle: user.handle });

    if (entity) {
      this.em.assign(entity, {
        loginPassword: newPassword,
        requirePasswordChange: false,
      }); // Update the entity in the database
      await this.em.flush();
    }
    return;
  }

  /**
   * Returns all open tickets assigned to the user.
   * @param user The user whose tickets are to be retrieved
   * @returns Array of open tickets
   */
  async getOpenTickets(user: PersonItem): Promise<TicketItem[]> {
    const items = await this.em.find(
      TicketItem,
      this.buildOpenTicketWhere(user),
    );
    return items || [];
  }

  /**
   * Returns all open events assigned to the user.
   * @param user The user whose events are to be retrieved
   * @returns Array of open events
   */
  async getOpenEvents(user: PersonItem): Promise<EventItem[]> {
    const items = await this.em.find(EventItem, this.buildOpenEventWhere(user));
    return items || [];
  }

  /**
   * Returns the count of open tasks for the user.
   * @param user The user whose open tasks are to be counted
   * @returns Object containing the count of open tasks
   */
  async countOpenTasks(user: PersonItem): Promise<{ count: number }> {
    const [openEventCount, openTicketCount] = await Promise.all([
      this.em.count(EventItem, this.buildOpenEventWhere(user)),
      this.em.count(TicketItem, this.buildOpenTicketWhere(user)),
    ]);

    return { count: openEventCount + openTicketCount };
  }

  private buildOpenTicketWhere(user: PersonItem): object {
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    return {
      assigneePerson: { handle: user?.handle },
      status: { handle: { $nin: ['closed'] } },
      deadlineDate: { $lte: todayEnd },
    };
  }

  private buildOpenEventWhere(user: PersonItem): object {
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    return {
      participants: { handle: user?.handle },
      status: { handle: { $nin: ['canceled', 'completed'] } },
      startDate: { $lte: todayEnd },
    };
  }

  /**
   * Aggregates permissions for a person and entityHandle, prioritizing stages and boolean values.
   * @param person The person whose permissions are to be aggregated
   * @param entityHandle The name of the entity
   * @returns AccumulatedPermissionDto containing permissions
   */
  getEntityPermissions(
    person: PersonItem,
    entityHandle: string,
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
    result.entityHandle = entityHandle;
    const permissions: AccumulatedPermissionBufferDto[] = [];

    for (const role of person?.roles || []) {
      const stage = role.stage?.handle || '';
      for (const perm of role.permissions) {
        if (perm.entity?.handle === entityHandle) {
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
   * @param key The permission key to check
   * @param permissions Array of permission buffers
   * @param stageOrder Array of stage handles sorted by priority
   * @returns Object containing the best permission value and stage
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
   * @param person The person whose permissions are to be retrieved
   * @returns Array of AccumulatedPermissionDto
   */
  getAllEntityPermissions(person: PersonItem): AccumulatedPermissionDto[] {
    return ENTITY_HANDLES.map((entityHandle) =>
      this.getEntityPermissions(person, entityHandle),
    );
  }

  /**
   * Returns the work week configuration for a given person.
   * @param person The person whose work week is to be retrieved
   * @returns WorkHourWeekItem or null if not found
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
