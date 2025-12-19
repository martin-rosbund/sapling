import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PersonItem } from '../entity/PersonItem';
import { EntityManager } from '@mikro-orm/core';
import { PersonTypeItem } from 'src/entity/PersonTypeItem';
import { PersonSessionItem } from 'src/entity/PersonSessionItem';

@Injectable()
// Service for authentication logic (user validation)
export class AuthService {
  constructor(private readonly em: EntityManager) {}

  /**
   * Validates a user by login name and password.
   * @param loginName - The user's login name
   * @param loginPassword - The user's password
   * @returns The PersonItem if valid, otherwise throws UnauthorizedException
   */
  async validate(
    loginName: string,
    loginPassword: string | null,
  ): Promise<PersonItem> {
    const person = await this.getSecurityUser(loginName);
    if (person?.comparePassword(loginPassword)) {
      return person;
    }
    throw new UnauthorizedException();
  }

  async getSecurityUser(
    loginName: string | undefined,
  ): Promise<PersonItem | null> {
    if (!loginName) {
      return null;
    }

    const person = await this.em.findOne(
      PersonItem,
      { loginName: loginName },
      {
        populate: [
          'company',
          'type',
          'roles',
          'session',
          'roles.stage',
          'roles.permissions',
          'roles.permissions.entity',
        ],
      },
    );

    return person;
  }

  async saveNewLogin(
    type: 'google' | 'azure',
    sessionHandle: string,
    profileHandle: string,
    accessToken: string,
    refreshToken: string,
    firstName: string,
    lastName: string,
    mail: string,
  ): Promise<PersonItem | null> {
    let person = await this.getSecurityUser(profileHandle);

    if (!person) {
      const personType = await this.em.findOne(PersonTypeItem, {
        handle: type,
      });

      person = this.em.create(PersonItem, {
        loginName: profileHandle,
        firstName: firstName,
        lastName: lastName,
        email: mail,
        type: personType,
      });

      await this.em.persist(person).flush();
    }

    let session = await this.em.findOne(PersonSessionItem, {
      person: person,
    });

    if (session) {
      session = this.em.assign(session, {
        accessToken: accessToken,
        refreshToken: refreshToken,
      });
    } else {
      session = this.em.create(PersonSessionItem, {
        number: sessionHandle,
        person: person,
        accessToken: accessToken,
        refreshToken: refreshToken,
      });
    }
    await this.em.persist(session).flush();
    person.session = session;

    return await this.getSecurityUser(profileHandle);
  }
}
