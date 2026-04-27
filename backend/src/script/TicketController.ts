import { TicketItem } from '../entity/TicketItem.js';
import { EntityItem } from '../entity/EntityItem.js';
import { PersonItem } from '../entity/PersonItem.js';
import type { EntityManager } from '@mikro-orm/core';
import { ScriptClass } from './core/script.class.js';
import {
  ScriptResultServer,
  ScriptResultServerMethods,
} from './core/script.result.server.js';
import type { ScriptServerContext } from './core/script.interface.js';
import { ContractItem } from '../entity/ContractItem.js';
import { SlaPolicyItem } from '../entity/SlaPolicyItem.js';
import { SupportQueueItem } from '../entity/SupportQueueItem.js';

/**
 * Controller for Note entity scripts.
 * Extends the ScriptClass to provide custom logic for Note operations.
 */
export class TicketController extends ScriptClass {
  /**
   * Creates a new instance of NoteController.
   *
   * @param {EntityItem} entity - The entity associated with the script.
   * @param {PersonItem} user - The user executing the script.
   */
  constructor(entity: EntityItem, user: PersonItem, em?: EntityManager) {
    super(entity, user, em);
  }

  async beforeInsert(items: TicketItem[]): Promise<ScriptResultServer> {
    const preparedItems = await Promise.all(
      items.map((item) =>
        this.prepareTicketSupportFields(
          item as unknown as Record<string, unknown>,
        ),
      ),
    );

    return new ScriptResultServer(
      preparedItems,
      ScriptResultServerMethods.overwrite,
    );
  }

  async beforeUpdate(
    items: TicketItem[],
    context?: ScriptServerContext,
  ): Promise<ScriptResultServer> {
    const currentItems = context?.currentItems ?? [];
    const preparedItems = await Promise.all(
      items.map((item, index) =>
        this.prepareTicketSupportFields(
          item as unknown as Record<string, unknown>,
          currentItems[index] as Record<string, unknown> | undefined,
        ),
      ),
    );

    return new ScriptResultServer(
      preparedItems,
      ScriptResultServerMethods.overwrite,
    );
  }

  /**
   * Event triggered before new Note records are inserted.
   * Sets the person property of each note to the current user's handle.
   *
   * @param {EventItem[]} items - The new Event records to be inserted.
   * @returns {Promise<ScriptResultServer>} The result of the before insert event.
   */
  async afterInsert(items: TicketItem[]): Promise<ScriptResultServer> {
    this.logDebug('afterInsert', 'Starting ticket number generation', {
      itemCount: items.length,
    });
    await this.sleep(0);

    if (items && items.length > 0) {
      for (const ticket of items) {
        this.logTrace('afterInsert', 'Generating ticket number', {
          ticketHandle: ticket.handle,
          createdAt: ticket.createdAt,
        });
        ticket.number =
          `${ticket.createdAt?.getFullYear()}#` +
          (ticket.handle ?? 0).toString().padStart(5, '0');
        this.logInfo('afterInsert', 'Assigned ticket number', {
          ticketHandle: ticket.handle,
          ticketNumber: ticket.number,
        });
      }
    }

    this.logDebug('afterInsert', 'Completed ticket number generation', {
      itemCount: items.length,
    });

    return new ScriptResultServer(items, ScriptResultServerMethods.overwrite);
  }

  private async prepareTicketSupportFields(
    input: Record<string, unknown>,
    currentTicket?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const data = { ...input };
    const mergedTicket = { ...(currentTicket ?? {}), ...data };
    const creatorCompanyHandle = this.normalizeNumericHandle(
      this.extractHandleValue(mergedTicket.creatorCompany),
    );
    const assigneeCompanyHandle = this.normalizeNumericHandle(
      this.extractHandleValue(mergedTicket.assigneeCompany),
    );
    const explicitContractHandle = this.normalizeNumericHandle(
      this.extractHandleValue(mergedTicket.contract),
    );
    const explicitQueueHandle = this.normalizeStringHandle(
      this.extractHandleValue(mergedTicket.supportQueue),
    );
    const explicitSlaPolicyHandle = this.normalizeStringHandle(
      this.extractHandleValue(mergedTicket.slaPolicy),
    );
    const contract =
      (explicitContractHandle != null
        ? await this.findContractByHandle(explicitContractHandle)
        : null) ??
      (creatorCompanyHandle != null
        ? await this.findDefaultContractForCompany(creatorCompanyHandle)
        : null) ??
      (assigneeCompanyHandle != null
        ? await this.findDefaultContractForCompany(assigneeCompanyHandle)
        : null);

    if (
      explicitContractHandle == null &&
      currentTicket?.contract == null &&
      contract?.handle != null
    ) {
      data.contract = contract.handle;
      mergedTicket.contract = contract.handle;
    }

    const queue =
      (explicitQueueHandle != null
        ? await this.findSupportQueueByHandle(explicitQueueHandle)
        : null) ??
      contract?.defaultSupportQueue ??
      null;

    if (
      explicitQueueHandle == null &&
      currentTicket?.supportQueue == null &&
      contract?.defaultSupportQueue?.handle != null
    ) {
      data.supportQueue = contract.defaultSupportQueue.handle;
      mergedTicket.supportQueue = contract.defaultSupportQueue.handle;
    }

    const supportTeamHandle = this.extractHandleValue(mergedTicket.supportTeam);
    if (
      supportTeamHandle == null &&
      currentTicket?.supportTeam == null &&
      (queue?.team?.handle != null ||
        contract?.defaultSupportTeam?.handle != null)
    ) {
      data.supportTeam =
        queue?.team?.handle ?? contract?.defaultSupportTeam?.handle;
      mergedTicket.supportTeam =
        queue?.team?.handle ?? contract?.defaultSupportTeam?.handle;
    }

    const resolvedSlaPolicy =
      (explicitSlaPolicyHandle != null
        ? await this.findSlaPolicyByHandle(explicitSlaPolicyHandle)
        : null) ??
      queue?.defaultSlaPolicy ??
      contract?.slaPolicy ??
      null;

    if (
      explicitSlaPolicyHandle == null &&
      currentTicket?.slaPolicy == null &&
      resolvedSlaPolicy?.handle != null
    ) {
      data.slaPolicy = resolvedSlaPolicy.handle;
      mergedTicket.slaPolicy = resolvedSlaPolicy.handle;
    }

    const shouldRecalculateSla =
      currentTicket == null ||
      [
        'contract',
        'slaPolicy',
        'supportQueue',
        'supportTeam',
        'startDate',
      ].some((key) => key in data);

    const startDate =
      this.normalizeDateValue(mergedTicket.startDate) ??
      this.normalizeDateValue(currentTicket?.startDate) ??
      new Date();

    if (resolvedSlaPolicy && shouldRecalculateSla) {
      if (
        typeof data.firstResponseDueAt === 'undefined' ||
        currentTicket?.firstResponseDueAt == null
      ) {
        data.firstResponseDueAt = this.addHours(
          startDate,
          resolvedSlaPolicy.firstResponseHours,
        );
      }

      if (
        typeof data.resolutionDueAt === 'undefined' ||
        currentTicket?.resolutionDueAt == null
      ) {
        data.resolutionDueAt = this.addHours(
          startDate,
          resolvedSlaPolicy.resolutionHours,
        );
      }

      if (
        typeof data.deadlineDate === 'undefined' &&
        (currentTicket?.deadlineDate == null || shouldRecalculateSla)
      ) {
        data.deadlineDate =
          data.resolutionDueAt ??
          this.addHours(startDate, resolvedSlaPolicy.resolutionHours);
      }
    }

    const statusHandle = this.extractHandleValue(mergedTicket.status);
    if (
      statusHandle != null &&
      statusHandle !== 'open' &&
      currentTicket?.firstRespondedAt == null &&
      typeof data.firstRespondedAt === 'undefined'
    ) {
      data.firstRespondedAt = startDate;
    }

    if (statusHandle === 'closed') {
      const resolvedAt =
        this.normalizeDateValue(mergedTicket.endDate) ??
        this.normalizeDateValue(mergedTicket.resolutionDueAt) ??
        new Date();

      if (
        currentTicket?.resolvedAt == null &&
        typeof data.resolvedAt === 'undefined'
      ) {
        data.resolvedAt = resolvedAt;
      }

      if (
        currentTicket?.endDate == null &&
        typeof data.endDate === 'undefined'
      ) {
        data.endDate = resolvedAt;
      }
    }

    return data;
  }

  private addHours(baseDate: Date, hours: number): Date {
    return new Date(baseDate.getTime() + hours * 60 * 60 * 1000);
  }

  private async findDefaultContractForCompany(
    companyHandle: number,
  ): Promise<ContractItem | null> {
    const [contract] = await this.em!.find(
      ContractItem,
      {
        company: { handle: companyHandle },
        isActive: true,
      },
      {
        populate: [
          'defaultSupportQueue',
          'defaultSupportQueue.team',
          'defaultSupportQueue.defaultSlaPolicy',
          'defaultSupportTeam',
          'slaPolicy',
        ],
        orderBy: { startDate: 'desc' },
        limit: 1,
      },
    );

    return contract ?? null;
  }

  private async findContractByHandle(
    handle: number,
  ): Promise<ContractItem | null> {
    return this.em!.findOne(
      ContractItem,
      { handle },
      {
        populate: [
          'defaultSupportQueue',
          'defaultSupportQueue.team',
          'defaultSupportQueue.defaultSlaPolicy',
          'defaultSupportTeam',
          'slaPolicy',
        ],
      },
    );
  }

  private async findSupportQueueByHandle(
    handle: string,
  ): Promise<SupportQueueItem | null> {
    return this.em!.findOne(
      SupportQueueItem,
      { handle },
      {
        populate: ['team', 'defaultSlaPolicy'],
      },
    );
  }

  private async findSlaPolicyByHandle(
    handle: string,
  ): Promise<SlaPolicyItem | null> {
    return this.em!.findOne(SlaPolicyItem, { handle });
  }

  private normalizeNumericHandle(
    handle: string | number | null | undefined,
  ): number | null {
    if (typeof handle === 'number') {
      return Number.isNaN(handle) ? null : handle;
    }

    if (typeof handle === 'string' && handle.trim().length > 0) {
      const parsedHandle = Number(handle);
      return Number.isNaN(parsedHandle) ? null : parsedHandle;
    }

    return null;
  }

  private normalizeStringHandle(
    handle: string | number | null | undefined,
  ): string | null {
    if (typeof handle === 'string') {
      const normalizedHandle = handle.trim();
      return normalizedHandle.length > 0 ? normalizedHandle : null;
    }

    if (typeof handle === 'number' && !Number.isNaN(handle)) {
      return String(handle);
    }

    return null;
  }

  private normalizeDateValue(value: unknown): Date | null | undefined {
    if (value === null) {
      return null;
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? undefined : value;
    }

    if (typeof value === 'string' && !value.trim()) {
      return null;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      const parsedDate = new Date(value);
      return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate;
    }

    if (typeof value === 'string') {
      const parsedDate = new Date(value);
      return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate;
    }

    return undefined;
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

    if ('unwrap' in objectValue && typeof objectValue.unwrap === 'function') {
      return this.extractHandleValue((objectValue.unwrap as () => unknown)());
    }

    if (
      'getEntity' in objectValue &&
      typeof objectValue.getEntity === 'function'
    ) {
      return this.extractHandleValue(
        (objectValue.getEntity as () => unknown)(),
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
