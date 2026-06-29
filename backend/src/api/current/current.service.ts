import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { PersonItem } from '../../entity/PersonItem';
import { TicketItem } from '../../entity/TicketItem';
import { EventItem } from '../../entity/EventItem';
import { SalesOpportunityItem } from '../../entity/SalesOpportunityItem';
import { EffortEstimateItem } from '../../entity/EffortEstimateItem';
import { ENTITY_HANDLES } from '../../entity/global/entity.registry';
import { WorkHourWeekItem } from '../../entity/WorkHourWeekItem';
import { DashboardItem } from '../../entity/DashboardItem';
import { DashboardTemplateItem } from '../../entity/DashboardTemplateItem';
import { FavoriteItem } from '../../entity/FavoriteItem';
import { FavoriteTemplateItem } from '../../entity/FavoriteTemplateItem';
import { RoleItem } from '../../entity/RoleItem';
import { KpiItem } from '../../entity/KpiItem';
import { InboxService } from '../inbox/inbox.service';
import { InboxNotificationItem } from '../../entity/InboxNotificationItem';
import { SessionStoreItem } from '../../entity/SessionStoreItem';
import {
  AccumulatedPermissionDto,
  AccumulatedPermissionBufferDto,
} from './dto/accumulated-permission.dto';

export interface OpenTaskSnapshot {
  count: number;
  tickets: TicketItem[];
  tasks: EventItem[];
  salesOpportunities: SalesOpportunityItem[];
  effortEstimates: EffortEstimateItem[];
  notifications: InboxNotificationItem[];
}

export interface CurrentProfileUpdateDto {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  mobile?: string | null;
  color?: string | null;
}

export interface CurrentSessionDto {
  id: string;
  isCurrent: boolean;
  deviceLabel: string;
  createdAt: Date | null;
  lastActivityAt: Date | null;
  expiresAt: Date;
}

interface StoredSessionPayload {
  passport?: {
    user?: {
      handle?: number | string;
      impersonatedHandle?: number | string;
    };
  };
}

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
  constructor(
    private readonly em: EntityManager,
    private readonly inboxService: InboxService,
  ) {}

  private forkEntityManager(): EntityManager {
    return this.em.fork();
  }

  /**
   * Reloads the current user with the relations needed by the frontend profile flow.
   * @param user The current session user or any object carrying the user handle
   * @returns Fully populated PersonItem or null if it no longer exists
   */
  async getPerson(
    user: Pick<PersonItem, 'handle'>,
  ): Promise<PersonItem | null> {
    if (user.handle == null) {
      return null;
    }

    const em = this.forkEntityManager();
    await this.ensureStarterWorkspace(em, user.handle);

    const person = await em.findOne(
      PersonItem,
      { handle: user.handle },
      {
        populate: [
          'company',
          'company.country',
          'company.holidayGroup',
          'type',
          'language',
          'holidayGroup',
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

  private async ensureStarterWorkspace(
    em: EntityManager,
    personHandle: number,
  ): Promise<void> {
    const person = await em.findOne(
      PersonItem,
      { handle: personHandle },
      {
        populate: [
          'roles',
          'roles.starterDashboardTemplates',
          'roles.starterDashboardTemplates.kpis',
          'roles.starterFavoriteTemplates',
          'roles.starterFavoriteTemplates.entity',
          'roles.starterFavoriteTemplates.entityRoute',
        ],
      },
    );

    if (!person) {
      return;
    }

    const starterDashboardTemplates =
      this.collectStarterDashboardTemplates(person);
    const starterFavoriteTemplates =
      this.collectStarterFavoriteTemplates(person);

    if (
      starterDashboardTemplates.length === 0 &&
      starterFavoriteTemplates.length === 0
    ) {
      return;
    }

    const [dashboardCount, favoriteCount] = await Promise.all([
      starterDashboardTemplates.length > 0
        ? em.count(DashboardItem, { person: { handle: personHandle } })
        : Promise.resolve(0),
      starterFavoriteTemplates.length > 0
        ? em.count(FavoriteItem, { person: { handle: personHandle } })
        : Promise.resolve(0),
    ]);

    const starterDashboards =
      dashboardCount === 0
        ? starterDashboardTemplates.map((template) =>
            this.createDashboardFromTemplate(person, template),
          )
        : [];

    const starterFavorites =
      favoriteCount === 0
        ? starterFavoriteTemplates.map((template) =>
            this.createFavoriteFromTemplate(person, template),
          )
        : [];

    if (starterDashboards.length === 0 && starterFavorites.length === 0) {
      return;
    }

    for (const dashboard of starterDashboards) {
      em.persist(dashboard);
    }

    for (const favorite of starterFavorites) {
      em.persist(favorite);
    }

    await em.flush();
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

  async updateProfile(
    user: Pick<PersonItem, 'handle'>,
    dto: CurrentProfileUpdateDto,
  ): Promise<PersonItem> {
    if (user.handle == null) {
      throw new Error('login.userNotFound');
    }

    const person = await this.em.findOne(PersonItem, { handle: user.handle });

    if (!person) {
      throw new Error('login.userNotFound');
    }

    const firstName = this.normalizeRequiredText(
      dto.firstName,
      person.firstName,
    );
    const lastName = this.normalizeRequiredText(dto.lastName, person.lastName);

    person.firstName = firstName;
    person.lastName = lastName;
    person.phone = this.normalizeOptionalText(dto.phone, 32);
    person.mobile = this.normalizeOptionalText(dto.mobile, 32);
    person.color = this.normalizeColor(dto.color, person.color ?? '#4CAF50');

    await this.em.flush();

    return (await this.getPerson(person)) ?? person;
  }

  async getCurrentSessions(
    user: Pick<PersonItem, 'handle'>,
    currentSessionId?: string | null,
  ): Promise<CurrentSessionDto[]> {
    if (user.handle == null) {
      return [];
    }

    const now = new Date();
    const records = await this.em.find(
      SessionStoreItem,
      { expiresAt: { $gt: now } },
      { orderBy: { updatedAt: 'DESC' } },
    );

    return records
      .filter((record) => this.getSessionUserHandle(record) === user.handle)
      .map((record) => this.mapCurrentSession(record, currentSessionId))
      .sort((left, right) => {
        if (left.isCurrent !== right.isCurrent) {
          return left.isCurrent ? -1 : 1;
        }

        return (
          new Date(right.lastActivityAt ?? 0).getTime() -
          new Date(left.lastActivityAt ?? 0).getTime()
        );
      });
  }

  async terminateOtherSessions(
    user: Pick<PersonItem, 'handle'>,
    currentSessionId?: string | null,
  ): Promise<{ terminatedCount: number; sessions: CurrentSessionDto[] }> {
    if (user.handle == null) {
      return { terminatedCount: 0, sessions: [] };
    }

    const sessions = await this.getCurrentSessionRecords(user);
    const deletableSessionIds = sessions
      .filter((sessionRecord) => sessionRecord.handle !== currentSessionId)
      .map((sessionRecord) => sessionRecord.handle);

    if (deletableSessionIds.length > 0) {
      await this.em.nativeDelete(SessionStoreItem, {
        handle: { $in: deletableSessionIds },
      });
    }

    return {
      terminatedCount: deletableSessionIds.length,
      sessions: await this.getCurrentSessions(user, currentSessionId),
    };
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
      {
        populate: ['status', 'priority'],
      },
    );
    return items || [];
  }

  /**
   * Returns all open events assigned to the user.
   * @param user The user whose events are to be retrieved
   * @returns Array of open events
   */
  async getOpenEvents(user: PersonItem): Promise<EventItem[]> {
    const items = await this.em.find(
      EventItem,
      this.buildOpenEventWhere(user),
      {
        populate: ['status', 'type'],
      },
    );
    return items || [];
  }

  /**
   * Returns all open sales opportunities assigned to the user.
   * @param user The user whose sales opportunities are to be retrieved
   * @returns Array of open sales opportunities
   */
  async getOpenSalesOpportunities(
    user: PersonItem,
  ): Promise<SalesOpportunityItem[]> {
    const items = await this.em.find(
      SalesOpportunityItem,
      this.buildOpenSalesOpportunityWhere(user),
      {
        populate: ['type', 'forecast', 'assigneeCompany', 'creatorCompany'],
      },
    );
    return items || [];
  }

  async getOpenEffortEstimates(
    user: PersonItem,
  ): Promise<EffortEstimateItem[]> {
    const items = await this.em.find(
      EffortEstimateItem,
      this.buildOpenEffortEstimateWhere(user),
      {
        populate: [
          'status',
          'assigneeCompany',
          'assigneePerson',
          'creatorCompany',
          'creatorPerson',
          'salesOpportunity',
          'ticket',
        ],
      },
    );
    return items || [];
  }

  async getOpenTaskSnapshot(user: PersonItem): Promise<OpenTaskSnapshot> {
    const [tickets, tasks, salesOpportunities, effortEstimates, notifications] =
      await Promise.all([
        this.getOpenTickets(user),
        this.getOpenEvents(user),
        this.getOpenSalesOpportunities(user),
        this.getOpenEffortEstimates(user),
        this.inboxService.getUnreadNotifications(user),
      ]);

    return {
      count:
        tickets.length +
        tasks.length +
        salesOpportunities.length +
        effortEstimates.length +
        notifications.length,
      tickets,
      tasks,
      salesOpportunities,
      effortEstimates,
      notifications,
    };
  }

  async markInboxNotificationRead(
    handle: number,
    user: PersonItem,
  ): Promise<InboxNotificationItem> {
    return this.inboxService.markNotificationRead(handle, user);
  }

  private buildOpenTicketWhere(user: PersonItem): object {
    return {
      assigneePerson: { handle: user?.handle },
      status: { handle: { $nin: ['closed'] } },
    };
  }

  private buildOpenEventWhere(user: PersonItem): object {
    return {
      $or: [
        {
          isPrivate: false,
          participants: { handle: user?.handle },
        },
        {
          isPrivate: true,
          creatorPerson: { handle: user?.handle },
        },
      ],
      status: { handle: { $nin: ['canceled', 'completed'] } },
    };
  }

  private buildOpenSalesOpportunityWhere(user: PersonItem): object {
    return {
      assigneePerson: { handle: user?.handle },
      isActive: true,
    };
  }

  private buildOpenEffortEstimateWhere(user: PersonItem): object {
    return {
      assigneePerson: { handle: user?.handle },
      isActive: true,
      status: { handle: { $nin: ['completed', 'cancelled'] } },
    };
  }

  private async getCurrentSessionRecords(
    user: Pick<PersonItem, 'handle'>,
  ): Promise<SessionStoreItem[]> {
    if (user.handle == null) {
      return [];
    }

    const records = await this.em.find(SessionStoreItem, {
      expiresAt: { $gt: new Date() },
    });

    return records.filter(
      (record) => this.getSessionUserHandle(record) === user.handle,
    );
  }

  private mapCurrentSession(
    record: SessionStoreItem,
    currentSessionId?: string | null,
  ): CurrentSessionDto {
    return {
      id: this.maskSessionId(record.handle),
      isCurrent: Boolean(
        currentSessionId && record.handle === currentSessionId,
      ),
      deviceLabel: 'Browser-Sitzung',
      createdAt: record.createdAt ?? null,
      lastActivityAt: record.updatedAt ?? record.createdAt ?? null,
      expiresAt: record.expiresAt,
    };
  }

  private getSessionUserHandle(record: SessionStoreItem): number | null {
    const payload = this.parseSessionPayload(record.payload);
    const handle = payload?.passport?.user?.handle;

    if (typeof handle === 'number' && Number.isFinite(handle)) {
      return handle;
    }

    if (typeof handle === 'string') {
      const parsedHandle = Number(handle);
      return Number.isFinite(parsedHandle) ? parsedHandle : null;
    }

    return null;
  }

  private parseSessionPayload(payload: unknown): StoredSessionPayload | null {
    try {
      const parsedPayload =
        typeof payload === 'string'
          ? (JSON.parse(payload) as unknown)
          : payload;

      if (!parsedPayload || typeof parsedPayload !== 'object') {
        return null;
      }

      return parsedPayload;
    } catch {
      return null;
    }
  }

  private maskSessionId(sessionId: string): string {
    const suffix = sessionId.slice(-8);
    return suffix ? `...${suffix}` : '...';
  }

  private normalizeRequiredText(value: unknown, fallback: string): string {
    if (typeof value !== 'string') {
      return fallback;
    }

    const normalizedValue = value.trim().slice(0, 64);
    return normalizedValue || fallback;
  }

  private normalizeOptionalText(
    value: unknown,
    maxLength: number,
  ): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const normalizedValue = value.trim().slice(0, maxLength);
    return normalizedValue || undefined;
  }

  private normalizeColor(value: unknown, fallback: string): string {
    if (typeof value !== 'string') {
      return fallback;
    }

    const normalizedValue = value.trim();
    return /^#[0-9a-fA-F]{6}$/.test(normalizedValue)
      ? normalizedValue
      : fallback;
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

  private collectStarterDashboardTemplates(
    person: PersonItem,
  ): DashboardTemplateItem[] {
    return this.getUniqueTemplates(
      this.getCollectionItems<RoleItem>(person.roles).flatMap((role) =>
        this.getCollectionItems(role.starterDashboardTemplates),
      ),
    );
  }

  private collectStarterFavoriteTemplates(
    person: PersonItem,
  ): FavoriteTemplateItem[] {
    return this.getUniqueTemplates(
      this.getCollectionItems<RoleItem>(person.roles).flatMap((role) =>
        this.getCollectionItems(role.starterFavoriteTemplates),
      ),
    );
  }

  private createDashboardFromTemplate(
    person: PersonItem,
    template: DashboardTemplateItem,
  ): DashboardItem {
    const dashboard = new DashboardItem();
    dashboard.name = template.name;
    dashboard.person = person;

    const starterKpis = this.getCollectionItems<KpiItem>(template.kpis);
    if (starterKpis.length > 0) {
      for (const starterKpi of starterKpis) {
        dashboard.kpis.add(starterKpi);
      }
    }

    return dashboard;
  }

  private createFavoriteFromTemplate(
    person: PersonItem,
    template: FavoriteTemplateItem,
  ): FavoriteItem {
    const favorite = new FavoriteItem();
    favorite.title = template.name;
    favorite.person = person;
    favorite.entity = template.entity;
    favorite.entityRoute = template.entityRoute;
    favorite.filter = this.cloneJsonValue(template.filter);

    return favorite;
  }

  private getCollectionItems<T>(value: unknown): T[] {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value as T[];
    }

    if (typeof value === 'object' && 'getItems' in value) {
      const getItems = (value as { getItems?: () => unknown }).getItems;
      if (typeof getItems === 'function') {
        const items = getItems.call(value) as unknown;
        return Array.isArray(items) ? (items as T[]) : [];
      }
    }

    if (typeof (value as Iterable<T>)[Symbol.iterator] === 'function') {
      return Array.from(value as Iterable<T>);
    }

    return [];
  }

  private getUniqueTemplates<T extends { handle?: number; name?: string }>(
    templates: T[],
  ): T[] {
    const seenKeys = new Set<string>();

    return templates.filter((template) => {
      const templateKey =
        template.handle != null
          ? `handle:${template.handle}`
          : `name:${template.name ?? ''}`;

      if (seenKeys.has(templateKey)) {
        return false;
      }

      seenKeys.add(templateKey);
      return true;
    });
  }

  private cloneJsonValue<T>(value: T): T {
    if (value == null) {
      return value;
    }

    return JSON.parse(JSON.stringify(value)) as T;
  }
}
