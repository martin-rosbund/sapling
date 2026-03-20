/**
 * @class AuthService
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Service for authentication logic (user validation).
 *
 * @property        {EntityManager} em Entity manager for database operations
 *
 * @method          validate         Validates a user by login name and password
 * @method          getSecurityUser  Retrieves a user by login name
 * @method          saveNewLogin     Saves a new login for Google or Azure authentication
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PersonItem } from '../entity/PersonItem';
import { EntityManager } from '@mikro-orm/core';
import { PersonTypeItem } from 'src/entity/PersonTypeItem';
import { PersonSessionItem } from 'src/entity/PersonSessionItem';

@Injectable()
export class AuthService {
  /**
   * Entity manager for database operations.
   * @type {EntityManager}
   */
  constructor(private readonly em: EntityManager) {}

  /**
   * Validates a user by login name and password.
   * @param {string} loginName The user's login name
   * @param {string | null} loginPassword The user's password
   * @returns {Promise<PersonItem>} The PersonItem if valid, otherwise throws UnauthorizedException
   */
  async validate(
    loginName: string,
    loginPassword: string | null,
  ): Promise<PersonItem> {
    if (loginPassword && loginName) {
      const person = await this.getSecurityUser(loginName);
      if (person?.comparePassword(loginPassword)) {
        return person;
      }
    }
    throw new UnauthorizedException();
  }

  /**
   * Retrieves a user by login name.
   * @param {string | undefined} loginName The user's login name
   * @returns {Promise<PersonItem | null>} The PersonItem or null if not found
   */
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

  /**
   * Saves a new login for Google or Azure authentication.
   * @param {'google' | 'azure'} type The authentication type
   * @param {string} sessionHandle The session handle
   * @param {string} profileHandle The profile handle
   * @param {string} accessToken The access token
   * @param {string} refreshToken The refresh token
   * @param {string} firstName The user's first name
   * @param {string} lastName The user's last name
   * @param {string} mail The user's email
   * @returns {Promise<PersonItem | null>} The PersonItem or null if not found
   */
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

      if (personType) {
        person = this.em.create(PersonItem, {
          loginName: profileHandle,
          firstName: firstName,
          lastName: lastName,
          email: mail,
          type: personType,
        });

        await this.em.persist(person).flush();
      }
    }

    let session = await this.em.findOne(PersonSessionItem, {
      person: person,
    });

    if (person) {
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
    }

    return await this.getSecurityUser(profileHandle);
  }
}
