import { EntityItem } from '../entity/EntityItem.js';
import { PersonItem } from '../entity/PersonItem.js';
import type { EntityManager } from '@mikro-orm/core';
import { Collection } from '@mikro-orm/core';
import { ScriptClass } from './core/script.class.js';
import {
  ScriptResultClient,
  ScriptResultClientMethods,
} from './core/script.result.client.js';
import {
  ScriptResultServer,
  ScriptResultServerMethods,
} from './core/script.result.server.js';
import { SocialMediaItem } from '../entity/SocialMediaItem.js';

/**
 * Controller for Note entity scripts.
 * Extends the ScriptClass to provide custom logic for Note operations.
 */
export class PersonController extends ScriptClass {
  /**
   * Creates a new instance of NoteController.
   *
   * @param {EntityItem} entity - The entity associated with the script.
   * @param {PersonItem} user - The user executing the script.
   */
  constructor(entity: EntityItem, user: PersonItem, em?: EntityManager) {
    super(entity, user, em);
  }

  async execute(items: object[], name: string): Promise<ScriptResultClient> {
    if (name !== 'pseudonymize') {
      return super.execute(items, name);
    }

    const persons = await Promise.all(
      (items as PersonItem[]).map((person) =>
        this.loadPersonForPseudonymization(person),
      ),
    );

    for (const person of persons) {
      this.pseudonymizePerson(person);
    }

    if (this.em) {
      await this.em.flush();
    }

    global.log.trace(
      `scriptClass - execute - ${this.entity.handle} - action pseudonymize - count items ${items.length}`,
    );

    const result = new ScriptResultClient(
      ScriptResultClientMethods.setItemData,
    );
    result.item = persons[0] ?? {};
    return result;
  }

  /**
   * Event triggered before new Note records are inserted.
   * Sets the person property of each note to the current user's handle.
   *
   * @param {EventItem[]} items - The new Event records to be inserted.
   * @returns {Promise<ScriptResultServer>} The result of the before insert event.
   */
  async beforeUpdate(items: PersonItem[]): Promise<ScriptResultServer> {
    await this.sleep(0);

    if (items && items.length > 0) {
      for (const person of items) {
        if (person.loginPassword == '' || person.loginPassword == null) {
          delete person.loginPassword;
        }
      }
    }

    global.log.trace(
      `scriptClass - beforeUpdate - ${this.entity.handle} - count items ${items.length}`,
    );

    return new ScriptResultServer(items, ScriptResultServerMethods.overwrite);
  }

  private async loadPersonForPseudonymization(
    person: PersonItem,
  ): Promise<PersonItem> {
    if (!this.em || person.handle == null) {
      return person;
    }

    const loadedPerson = await this.em.findOne(
      PersonItem,
      { handle: person.handle },
      {
        populate: ['socialMediaProfiles', 'apiTokens', 'session'],
      },
    );

    return loadedPerson ?? person;
  }

  private pseudonymizePerson(person: PersonItem) {
    const pseudonymHandle = person.handle ?? 0;
    const pseudonymSuffix = pseudonymHandle.toString().padStart(6, '0');

    person.firstName = 'Pseudonym';
    person.lastName = `Person ${pseudonymSuffix}`;
    person.loginName = `pseudonym-person-${pseudonymHandle}`;
    person.loginPassword = undefined;
    person.phone = `+000${pseudonymSuffix}`;
    person.mobile = `+0009${pseudonymSuffix}`;
    person.email = `pseudonym-person-${pseudonymHandle}@example.invalid`;
    person.birthDay = this.createPseudonymizedBirthday(pseudonymHandle);
    person.isActive = false;
    person.sendNewsletter = false;
    person.requirePasswordChange = true;

    for (const profile of this.toArray(person.socialMediaProfiles)) {
      this.pseudonymizeSocialMediaProfile(profile, pseudonymSuffix);
    }

    for (const apiToken of this.toArray(person.apiTokens)) {
      apiToken.isActive = false;
      apiToken.allowedIps = [];
    }

    if (this.em && person.session) {
      this.em.remove(person.session);
      person.session = undefined;
    }
  }

  private pseudonymizeSocialMediaProfile(
    profile: SocialMediaItem,
    pseudonymSuffix: string,
  ) {
    profile.title = `Pseudonym ${pseudonymSuffix}`;
    profile.username = `pseudonym-${pseudonymSuffix}`;
    profile.externalId = undefined;
    profile.notes = undefined;
    profile.url = `https://example.invalid/pseudonym-${pseudonymSuffix}`;
  }

  private createPseudonymizedBirthday(handle: number): Date {
    const day = (handle % 28) + 1;
    return new Date(Date.UTC(1970, 0, day));
  }

  private toArray<T extends object>(
    collection?: Collection<T> | T[] | null,
  ): T[] {
    if (!collection) {
      return [];
    }

    if (Array.isArray(collection)) {
      return collection;
    }

    return collection.isInitialized() ? (collection.toArray() as T[]) : [];
  }
}
