import type { EntityManager, RequiredEntityData } from '@mikro-orm/core';
import { EntityItem } from '../entity/EntityItem.js';
import { EventItem } from '../entity/EventItem.js';
import { PersonItem } from '../entity/PersonItem.js';
import { PhoneCallItem } from '../entity/PhoneCallItem.js';
import { ScriptClass } from './core/script.class.js';
import { ScriptResultServer } from './core/script.result.server.js';

const PHONE_CALL_EVENT_DURATION_MINUTES = 15;

export class PhoneCallController extends ScriptClass {
  constructor(entity: EntityItem, user: PersonItem, em?: EntityManager) {
    super(entity, user, em);
  }

  async afterInsert(items: PhoneCallItem[]): Promise<ScriptResultServer> {
    if (!this.em || items.length === 0) {
      return new ScriptResultServer(items);
    }

    for (const phoneCall of items) {
      const creatorCompany = this.user.company ?? phoneCall.person?.company;

      if (!creatorCompany || !phoneCall.person) {
        global.log.warn(
          `scriptClass - afterInsert - ${this.entity.handle} - skipped event creation for phone call ${phoneCall.handle}`,
        );
        continue;
      }

      const startDate = phoneCall.createdAt
        ? new Date(phoneCall.createdAt)
        : new Date();
      const endDate = new Date(startDate);
      endDate.setMinutes(
        endDate.getMinutes() + PHONE_CALL_EVENT_DURATION_MINUTES,
      );

      const event = this.em.create(
        EventItem,
        {
          title: `Telefonat ${phoneCall.phoneNumber}`,
          description: phoneCall.note ?? undefined,
          startDate,
          endDate,
          isAllDay: false,
          onlineMeetingURL: '',
          type: { handle: 'internal' },
          status: { handle: 'scheduled' },
          assigneeCompany: phoneCall.person.company,
          assigneePerson: phoneCall.person,
          creatorCompany,
          creatorPerson: this.user,
        } as RequiredEntityData<EventItem>,
      );

      event.participants.add(phoneCall.person);
      this.em.persist(event);
    }

    await this.em.flush();

    global.log.trace(
      `scriptClass - afterInsert - ${this.entity.handle} - count items ${items.length}`,
    );

    return new ScriptResultServer(items);
  }
}
