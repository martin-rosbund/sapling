import type { EntityManager, RequiredEntityData } from '@mikro-orm/core';
import { CompanyItem } from '../entity/CompanyItem.js';
import { EntityItem } from '../entity/EntityItem.js';
import { EventItem } from '../entity/EventItem.js';
import { EventStatusItem } from '../entity/EventStatusItem.js';
import { EventTypeItem } from '../entity/EventTypeItem.js';
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

    const creatorUser = await this.loadCurrentUserWithCompany();
    const phoneCalls = await Promise.all(
      items.map((phoneCall) => this.loadPhoneCallWithRelations(phoneCall)),
    );

    for (const phoneCall of phoneCalls) {
      const creatorCompany = creatorUser.company ?? phoneCall.person?.company;

      if (!creatorCompany || !phoneCall.person) {
        global.log.warn(
          `scriptClass - afterInsert - ${this.entity.handle} - skipped event creation for phone call ${phoneCall.handle}`,
        );
        continue;
      }

      const assigneeCompanyHandle = phoneCall.person.company?.handle;
      const assigneePersonHandle = phoneCall.person.handle;
      const creatorCompanyHandle = creatorCompany.handle;
      const creatorPersonHandle = creatorUser.handle;

      if (
        assigneePersonHandle == null ||
        creatorCompanyHandle == null ||
        creatorPersonHandle == null
      ) {
        global.log.warn(
          `scriptClass - afterInsert - ${this.entity.handle} - skipped event creation for phone call ${phoneCall.handle} due to missing relation handle`,
        );
        continue;
      }

      const assigneeCompanyRef =
        assigneeCompanyHandle == null
          ? undefined
          : this.em.getReference(CompanyItem, assigneeCompanyHandle as never);
      const assigneePersonRef = this.em.getReference(
        PersonItem,
        assigneePersonHandle as never,
      );
      const creatorCompanyRef = this.em.getReference(
        CompanyItem,
        creatorCompanyHandle as never,
      );
      const creatorPersonRef = this.em.getReference(
        PersonItem,
        creatorPersonHandle as never,
      );
      const eventTypeRef = this.em.getReference(EventTypeItem, 'call' as never);
      const eventStatusRef = this.em.getReference(
        EventStatusItem,
        'completed' as never,
      );

      const startDate = phoneCall.createdAt
        ? new Date(phoneCall.createdAt)
        : new Date();
      const endDate = new Date(startDate);
      endDate.setMinutes(
        endDate.getMinutes() + PHONE_CALL_EVENT_DURATION_MINUTES,
      );

      const event = this.em.create(EventItem, {
        title: `Telefonat ${phoneCall.phoneNumber}`,
        description: phoneCall.note ?? undefined,
        startDate,
        endDate,
        isAllDay: false,
        onlineMeetingURL: '',
        type: eventTypeRef,
        status: eventStatusRef,
        assigneeCompany: assigneeCompanyRef,
        assigneePerson: assigneePersonRef,
        creatorCompany: creatorCompanyRef,
        creatorPerson: creatorPersonRef,
      } as RequiredEntityData<EventItem>);

      event.participants.add(assigneePersonRef);
      this.em.persist(event);
    }

    await this.em.flush();

    global.log.trace(
      `scriptClass - afterInsert - ${this.entity.handle} - count items ${items.length}`,
    );

    return new ScriptResultServer(items);
  }

  private async loadPhoneCallWithRelations(
    phoneCall: PhoneCallItem,
  ): Promise<PhoneCallItem> {
    if (
      !this.em ||
      phoneCall.handle == null ||
      (phoneCall.person && phoneCall.person.company)
    ) {
      return phoneCall;
    }

    const loadedPhoneCall = await this.em.findOne(
      PhoneCallItem,
      { handle: phoneCall.handle },
      { populate: ['person', 'person.company'] },
    );

    return loadedPhoneCall ?? phoneCall;
  }

  private async loadCurrentUserWithCompany(): Promise<PersonItem> {
    if (!this.em || this.user.handle == null || this.user.company) {
      return this.user;
    }

    const loadedUser = await this.em.findOne(
      PersonItem,
      { handle: this.user.handle },
      { populate: ['company'] },
    );

    return loadedUser ?? this.user;
  }
}
