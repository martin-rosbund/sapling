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
    this.logDebug('execute', 'Received client script request', {
      action: name,
      itemCount: items.length,
    });

    if (name !== 'pseudonymize') {
      this.logTrace('execute', 'Delegating unsupported action to base class', {
        action: name,
      });
      return super.execute(items, name);
    }

    this.logInfo('execute', 'Starting person pseudonymization', {
      personHandles: (items as PersonItem[]).map(
        (person) => person.handle ?? 'unknown',
      ),
    });

    const persons = await Promise.all(
      (items as PersonItem[]).map((person) =>
        this.loadPersonForPseudonymization(person),
      ),
    );

    for (const person of persons) {
      this.logDebug('execute', 'Applying pseudonymization to person', {
        personHandle: person.handle,
      });
      this.pseudonymizePerson(person);
    }

    if (this.em) {
      this.logDebug(
        'execute',
        'Flushing pseudonymized people to persistence layer',
        {
          itemCount: persons.length,
        },
      );
      await this.em.flush();
      this.logInfo(
        'execute',
        'Persistence flush for pseudonymized people completed',
        {
          itemCount: persons.length,
        },
      );
    }

    this.logDebug('execute', 'Completed person pseudonymization', {
      itemCount: items.length,
    });

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
    this.logDebug('beforeUpdate', 'Starting person password cleanup', {
      itemCount: items.length,
    });
    await this.sleep(0);

    if (items && items.length > 0) {
      for (const person of items) {
        this.logTrace('beforeUpdate', 'Inspecting person password field', {
          personHandle: person.handle,
          hasPassword:
            person.loginPassword != null && person.loginPassword !== '',
        });

        if (person.loginPassword == '' || person.loginPassword == null) {
          delete person.loginPassword;
          this.logInfo('beforeUpdate', 'Removed empty login password field', {
            personHandle: person.handle,
          });
          continue;
        }

        this.logDebug('beforeUpdate', 'Keeping existing login password field', {
          personHandle: person.handle,
        });
      }
    }

    this.logDebug('beforeUpdate', 'Completed person password cleanup', {
      itemCount: items.length,
    });

    return new ScriptResultServer(items, ScriptResultServerMethods.overwrite);
  }

  private async loadPersonForPseudonymization(
    person: PersonItem,
  ): Promise<PersonItem> {
    this.logTrace('loadPersonForPseudonymization', 'Preparing person load', {
      personHandle: person.handle,
      canReload: Boolean(this.em && person.handle != null),
    });

    if (!this.em || person.handle == null) {
      this.logDebug(
        'loadPersonForPseudonymization',
        'Using provided person instance without reload',
        {
          personHandle: person.handle,
        },
      );
      return person;
    }

    const loadedPerson = await this.em.findOne(
      PersonItem,
      { handle: person.handle },
      {
        populate: ['socialMediaProfiles', 'apiTokens', 'session'],
      },
    );

    this.logDebug('loadPersonForPseudonymization', 'Finished person load', {
      requestedHandle: person.handle,
      loadedHandle: loadedPerson?.handle,
      wasReloaded: Boolean(loadedPerson),
    });

    return loadedPerson ?? person;
  }

  private pseudonymizePerson(person: PersonItem) {
    const pseudonymHandle = person.handle ?? 0;
    const pseudonymSuffix = pseudonymHandle.toString().padStart(6, '0');
    const socialMediaProfiles = this.toArray(person.socialMediaProfiles);
    const apiTokens = this.toArray(person.apiTokens);

    this.logInfo('pseudonymizePerson', 'Pseudonymizing person master data', {
      personHandle: person.handle,
      socialMediaCount: socialMediaProfiles.length,
      apiTokenCount: apiTokens.length,
      hasSession: Boolean(person.session),
    });

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

    for (const profile of socialMediaProfiles) {
      this.pseudonymizeSocialMediaProfile(profile, pseudonymSuffix);
    }

    for (const apiToken of apiTokens) {
      apiToken.isActive = false;
      apiToken.allowedIps = [];
      this.logDebug('pseudonymizePerson', 'Disabled person API token', {
        personHandle: person.handle,
        apiTokenHandle: apiToken.handle,
      });
    }

    if (this.em && person.session) {
      this.logInfo('pseudonymizePerson', 'Removing active person session', {
        personHandle: person.handle,
        sessionHandle: person.session.handle,
      });
      this.em.remove(person.session);
      person.session = undefined;
    }

    this.logDebug(
      'pseudonymizePerson',
      'Completed person master data pseudonymization',
      {
        personHandle: person.handle,
      },
    );
  }

  private pseudonymizeSocialMediaProfile(
    profile: SocialMediaItem,
    pseudonymSuffix: string,
  ) {
    this.logTrace(
      'pseudonymizeSocialMediaProfile',
      'Pseudonymizing social media profile',
      {
        profileHandle: profile.handle,
      },
    );
    profile.title = `Pseudonym ${pseudonymSuffix}`;
    profile.username = `pseudonym-${pseudonymSuffix}`;
    profile.externalId = undefined;
    profile.notes = undefined;
    profile.url = `https://example.invalid/pseudonym-${pseudonymSuffix}`;
    this.logDebug(
      'pseudonymizeSocialMediaProfile',
      'Completed social media profile pseudonymization',
      {
        profileHandle: profile.handle,
      },
    );
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
