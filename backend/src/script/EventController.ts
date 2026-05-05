import { GoogleCalendarService } from '../calendar/google/google.calendar.service';
import { AzureCalendarService } from '../calendar/azure/azure.calendar.service';
import type { EntityManager } from '@mikro-orm/core';
import { EntityItem } from '../entity/EntityItem.js';
import { PersonItem } from '../entity/PersonItem.js';
import { ScriptClass } from './core/script.class.js';
import {
  ScriptResultServer,
  ScriptResultServerMethods,
} from './core/script.result.server.js';
import { EventItem } from '../entity/EventItem.js';

/**
 * Controller for Note entity scripts.
 * Extends the ScriptClass to provide custom logic for Note operations.
 */
export class EventController extends ScriptClass {
  /**
   * Creates a new instance of NoteController.
   *
   * @param {EntityItem} entity - The entity associated with the script.
   * @param {PersonItem} user - The user executing the script.
   */
  constructor(
    entity: EntityItem,
    user: PersonItem,
    em: EntityManager,
    azureCalendarService: AzureCalendarService,
    googleCalendarService: GoogleCalendarService,
  ) {
    super(entity, user, em, azureCalendarService, googleCalendarService);
  }

  /**
   * Event triggered before Event records are created.
   * Defaults participants to assigneePerson and creatorPerson when empty.
   *
   * @param {EventItem[]} items - The new Event records to be inserted.
   * @returns {Promise<ScriptResultServer>} The result of the before insert event.
   */
  beforeInsert(items: EventItem[]): Promise<ScriptResultServer> {
    this.logDebug('beforeInsert', 'Handling event create defaults', {
      itemCount: items.length,
    });

    for (const event of items) {
      this.ensureDefaultParticipants(event);
    }

    return Promise.resolve(
      new ScriptResultServer(items, ScriptResultServerMethods.overwrite),
    );
  }

  /**
   * Event triggered after Event records are created.
   * Sets the person property of each Event to the current user's handle.
   *
   * @param {EventItem[]} items - The new Event records to be inserted.
   * @returns {Promise<ScriptResultServer>} The result of the before insert event.
   */
  async afterInsert(items: EventItem[]): Promise<ScriptResultServer> {
    this.logDebug('afterInsert', 'Handling event insert hook', {
      itemCount: items.length,
    });
    return this.sendEvent('afterInsert', items);
  }

  /**
   * Event triggered after Event records are updated.
   * Sets the person property of each Event to the current user's handle.
   *
   * @param {EventItem[]} items - The new Event records to be inserted.
   * @returns {Promise<ScriptResultServer>} The result of the before insert event.
   */
  async afterUpdate(items: EventItem[]): Promise<ScriptResultServer> {
    this.logDebug('afterUpdate', 'Handling event update hook', {
      itemCount: items.length,
    });
    return this.sendEvent('afterUpdate', items);
  }

  /**
   * Sends event data to the appropriate calendar service based on user type.
   * @param {EventItem[]} items - The new Event records to be inserted.
   * @returns {Promise<ScriptResultServer>} The result of the before insert event.
   */
  private async sendEvent(
    operation: 'afterInsert' | 'afterUpdate',
    items: EventItem[],
  ): Promise<ScriptResultServer> {
    this.logDebug(operation, 'Starting calendar synchronization', {
      itemCount: items.length,
      provider: this.user.type?.handle,
      hasSession: Boolean(this.user.session),
    });

    if (items && items.length > 0) {
      switch (this.user.type?.handle) {
        case 'azure': {
          if (this.azureCalendarService && this.user.session) {
            for (const event of items) {
              this.logInfo(operation, 'Queueing Azure calendar event', {
                eventHandle: event.handle,
              });
              await this.azureCalendarService.queueEvent(
                event,
                this.user.session,
              );
              this.logDebug(operation, 'Azure calendar event queued', {
                eventHandle: event.handle,
              });
            }
          } else {
            this.logWarn(
              operation,
              'Skipping Azure calendar synchronization due to missing dependencies',
              {
                hasCalendarService: Boolean(this.azureCalendarService),
                hasSession: Boolean(this.user.session),
              },
            );
          }
          break;
        }
        case 'google': {
          if (this.googleCalendarService && this.user.session) {
            for (const event of items) {
              this.logInfo(operation, 'Queueing Google calendar event', {
                eventHandle: event.handle,
              });
              await this.googleCalendarService.queueEvent(
                event,
                this.user.session,
              );
              this.logDebug(operation, 'Google calendar event queued', {
                eventHandle: event.handle,
              });
            }
          } else {
            this.logWarn(
              operation,
              'Skipping Google calendar synchronization due to missing dependencies',
              {
                hasCalendarService: Boolean(this.googleCalendarService),
                hasSession: Boolean(this.user.session),
              },
            );
          }
          break;
        }
        default: {
          this.logDebug(
            operation,
            'No matching calendar provider configured, skipping synchronization',
            {
              provider: this.user.type?.handle ?? 'unknown',
            },
          );
        }
      }
    } else {
      this.logTrace(operation, 'No events received for synchronization');
    }

    this.logDebug(operation, 'Calendar synchronization completed', {
      itemCount: items.length,
    });
    return new ScriptResultServer(items);
  }

  private ensureDefaultParticipants(event: EventItem): void {
    const record = event as unknown as Record<string, unknown>;

    if (this.hasParticipants(record.participants)) {
      return;
    }

    const participantHandles = [
      this.extractPersonHandle(record.assigneePerson),
      this.extractPersonHandle(record.creatorPerson),
    ].filter(
      (handle): handle is string | number =>
        typeof handle === 'string' || typeof handle === 'number',
    );
    const uniqueParticipantHandles = [...new Set(participantHandles)];

    if (uniqueParticipantHandles.length === 0) {
      return;
    }

    record.participants = uniqueParticipantHandles;
    this.logDebug(
      'beforeInsert',
      'Applied default event participants from assignee/creator',
      {
        eventHandle: event.handle,
        participantHandles: uniqueParticipantHandles,
      },
    );
  }

  private hasParticipants(value: unknown): boolean {
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (!value || typeof value !== 'object') {
      return false;
    }

    if ('length' in value && typeof value.length === 'number') {
      return value.length > 0;
    }

    if ('count' in value && typeof value.count === 'function') {
      return (value.count as () => number)() > 0;
    }

    return false;
  }

  private extractPersonHandle(value: unknown): string | number | null {
    if (typeof value === 'string' || typeof value === 'number') {
      return value;
    }

    if (!value || typeof value !== 'object' || !('handle' in value)) {
      return null;
    }

    const handle = (value as Record<string, unknown>).handle;
    return typeof handle === 'string' || typeof handle === 'number'
      ? handle
      : null;
  }
}
