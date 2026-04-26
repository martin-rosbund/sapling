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
    this.logDebug(
      'afterInsert',
      'Starting phone call follow-up event creation',
      {
        itemCount: items.length,
        hasEntityManager: Boolean(this.em),
      },
    );

    if (!this.em || items.length === 0) {
      this.logWarn(
        'afterInsert',
        'Skipping phone call follow-up event creation',
        {
          hasEntityManager: Boolean(this.em),
          itemCount: items.length,
        },
      );
      return new ScriptResultServer(items);
    }

    const creatorUser = await this.loadCurrentUserWithCompany();
    this.logDebug('afterInsert', 'Resolved creator context for phone calls', {
      creatorHandle: creatorUser.handle,
      creatorCompanyHandle: creatorUser.company?.handle,
    });
    const phoneCalls = await Promise.all(
      items.map((phoneCall) => this.loadPhoneCallWithRelations(phoneCall)),
    );
    this.logDebug('afterInsert', 'Loaded phone call relations', {
      itemCount: phoneCalls.length,
    });

    for (const phoneCall of phoneCalls) {
      const creatorCompany = creatorUser.company ?? phoneCall.person?.company;

      this.logTrace('afterInsert', 'Evaluating phone call for event creation', {
        phoneCallHandle: phoneCall.handle,
        personHandle: phoneCall.person?.handle,
        creatorCompanyHandle: creatorCompany?.handle,
      });

      if (!creatorCompany || !phoneCall.person) {
        this.logWarn(
          'afterInsert',
          'Skipping event creation due to missing creator company or assignee person',
          {
            phoneCallHandle: phoneCall.handle,
            hasCreatorCompany: Boolean(creatorCompany),
            hasPerson: Boolean(phoneCall.person),
          },
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
        this.logWarn(
          'afterInsert',
          'Skipping event creation due to missing relation handles',
          {
            phoneCallHandle: phoneCall.handle,
            assigneeCompanyHandle,
            assigneePersonHandle,
            creatorCompanyHandle,
            creatorPersonHandle,
          },
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
      this.logInfo('afterInsert', 'Prepared follow-up event for phone call', {
        phoneCallHandle: phoneCall.handle,
        assigneePersonHandle,
        creatorPersonHandle,
        startDate,
        endDate,
      });
    }

    this.logDebug('afterInsert', 'Flushing generated phone call events', {
      itemCount: phoneCalls.length,
    });
    await this.em.flush();
    this.logInfo(
      'afterInsert',
      'Completed phone call follow-up event creation',
      {
        itemCount: items.length,
      },
    );

    return new ScriptResultServer(items);
  }

  private async loadPhoneCallWithRelations(
    phoneCall: PhoneCallItem,
  ): Promise<PhoneCallItem> {
    this.logTrace(
      'loadPhoneCallWithRelations',
      'Preparing phone call relation load',
      {
        phoneCallHandle: phoneCall.handle,
        canReload:
          Boolean(this.em) &&
          phoneCall.handle != null &&
          !(phoneCall.person && phoneCall.person.company),
      },
    );

    if (
      !this.em ||
      phoneCall.handle == null ||
      (phoneCall.person && phoneCall.person.company)
    ) {
      this.logDebug(
        'loadPhoneCallWithRelations',
        'Using provided phone call instance',
        {
          phoneCallHandle: phoneCall.handle,
        },
      );
      return phoneCall;
    }

    const loadedPhoneCall = await this.em.findOne(
      PhoneCallItem,
      { handle: phoneCall.handle },
      { populate: ['person', 'person.company'] },
    );

    this.logDebug(
      'loadPhoneCallWithRelations',
      'Finished phone call relation load',
      {
        requestedHandle: phoneCall.handle,
        loadedHandle: loadedPhoneCall?.handle,
        wasReloaded: Boolean(loadedPhoneCall),
      },
    );

    return loadedPhoneCall ?? phoneCall;
  }

  private async loadCurrentUserWithCompany(): Promise<PersonItem> {
    this.logTrace(
      'loadCurrentUserWithCompany',
      'Preparing current user company load',
      {
        userHandle: this.user.handle,
        canReload:
          Boolean(this.em) && this.user.handle != null && !this.user.company,
      },
    );

    if (!this.em || this.user.handle == null || this.user.company) {
      this.logDebug(
        'loadCurrentUserWithCompany',
        'Using current user without reload',
        {
          userHandle: this.user.handle,
          companyHandle: this.user.company?.handle,
        },
      );
      return this.user;
    }

    const loadedUser = await this.em.findOne(
      PersonItem,
      { handle: this.user.handle },
      { populate: ['company'] },
    );

    this.logDebug(
      'loadCurrentUserWithCompany',
      'Finished current user company load',
      {
        requestedHandle: this.user.handle,
        loadedHandle: loadedUser?.handle,
        companyHandle: loadedUser?.company?.handle,
        wasReloaded: Boolean(loadedUser),
      },
    );

    return loadedUser ?? this.user;
  }
}
