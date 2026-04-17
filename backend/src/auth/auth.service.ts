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
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PersonItem } from '../entity/PersonItem';
import { EntityManager } from '@mikro-orm/core';
import { PersonTypeItem } from '../entity/PersonTypeItem';
import { PersonSessionItem } from '../entity/PersonSessionItem';
import {
  PERSON_API_TOKEN_HASH_INDICATOR,
  PersonApiTokenItem,
} from '../entity/PersonApiTokenItem';
import * as crypto from 'crypto';
import { CurrentService } from '../api/current/current.service';
import { CreateApiTokenDto } from './dto/create-api-token.dto';
import { RotateApiTokenDto } from './dto/rotate-api-token.dto';
import {
  ApiTokenResponseDto,
  ApiTokenSecretResponseDto,
} from './dto/api-token-response.dto';

@Injectable()
export class AuthService {
  /**
   * Entity manager for database operations.
   * @type {EntityManager}
   */
  constructor(
    private readonly em: EntityManager,
    private readonly currentService: CurrentService,
  ) {}

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

  async getSecurityUserByHandle(
    handle: number | undefined,
  ): Promise<PersonItem | null> {
    if (!handle) {
      return null;
    }

    return this.em.findOne(
      PersonItem,
      { handle },
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

  async validateApiToken(
    rawToken: string,
    requestIp: string,
  ): Promise<PersonItem | null> {
    const tokenHash = this.hashApiToken(rawToken);
    const token = await this.em.findOne(
      PersonApiTokenItem,
      { tokenHash, isActive: true },
      { populate: ['person'] },
    );

    if (!token) {
      return null;
    }

    if (token.expiresAt <= new Date()) {
      return null;
    }

    const personHandle = this.extractHandleValue(token.person);
    const user = await this.getSecurityUserByHandle(personHandle);
    if (!user || user.isActive === false) {
      return null;
    }

    if (
      token.allowedIps?.length &&
      !token.allowedIps.some(
        (allowedIp) => allowedIp.trim() === requestIp.trim(),
      )
    ) {
      return null;
    }

    token.lastUsedAt = new Date();
    await this.em.flush();

    return user;
  }

  async getApiTokens(
    currentUser: PersonItem,
    personHandle?: number,
  ): Promise<ApiTokenResponseDto[]> {
    const targetPersonHandle = this.resolveManagedPersonHandle(
      currentUser,
      personHandle,
      'allowRead',
    );

    const tokens = await this.em.find(
      PersonApiTokenItem,
      { person: { handle: targetPersonHandle } },
      {
        orderBy: { createdAt: 'desc' },
        populate: ['person'],
      },
    );

    return tokens.map((token) => this.toApiTokenResponse(token));
  }

  async createApiToken(
    currentUser: PersonItem,
    dto: CreateApiTokenDto,
  ): Promise<ApiTokenSecretResponseDto> {
    const targetPersonHandle = this.resolveManagedPersonHandle(
      currentUser,
      dto.personHandle,
      'allowInsert',
    );

    const person = await this.em.findOne(PersonItem, {
      handle: targetPersonHandle,
    });
    if (!person || person.isActive === false) {
      throw new NotFoundException('auth.personNotFound');
    }

    if (dto.expiresAt <= new Date()) {
      throw new ForbiddenException('auth.tokenExpired');
    }

    const secret = this.generateApiTokenSecret();
    const token = this.em.create(PersonApiTokenItem, {
      description: dto.description,
      tokenPrefix: '',
      tokenHash: '',
      rawToken: secret,
      expiresAt: dto.expiresAt,
      allowedIps: this.normalizeAllowedIps(dto.allowedIps),
      person,
      isActive: true,
    });

    await this.em.persist(token).flush();

    return {
      token: this.toApiTokenResponse(token),
      secret,
    };
  }

  async rotateApiToken(
    currentUser: PersonItem,
    tokenHandle: number,
    dto: RotateApiTokenDto,
  ): Promise<ApiTokenSecretResponseDto> {
    const existing = await this.getManagedApiToken(
      currentUser,
      tokenHandle,
      'allowUpdate',
    );
    const targetPersonHandle = this.extractHandleValue(existing.person);
    const person = await this.em.findOne(PersonItem, {
      handle: targetPersonHandle,
    });
    if (!person || person.isActive === false) {
      throw new NotFoundException('auth.personNotFound');
    }

    const nextExpiresAt = dto.expiresAt ?? existing.expiresAt;
    if (nextExpiresAt <= new Date()) {
      throw new ForbiddenException('auth.tokenExpired');
    }

    existing.isActive = false;

    const secret = this.generateApiTokenSecret();
    const nextToken = this.em.create(PersonApiTokenItem, {
      description: dto.description ?? existing.description,
      tokenPrefix: '',
      tokenHash: '',
      rawToken: secret,
      expiresAt: nextExpiresAt,
      allowedIps:
        this.normalizeAllowedIps(dto.allowedIps) ?? existing.allowedIps,
      person,
      isActive: true,
    });

    await this.em.persist(nextToken).flush();

    return {
      token: this.toApiTokenResponse(nextToken),
      secret,
    };
  }

  async deactivateApiToken(
    currentUser: PersonItem,
    tokenHandle: number,
  ): Promise<ApiTokenResponseDto> {
    const token = await this.getManagedApiToken(
      currentUser,
      tokenHandle,
      'allowDelete',
    );
    token.isActive = false;
    await this.em.flush();
    return this.toApiTokenResponse(token);
  }

  private async getManagedApiToken(
    currentUser: PersonItem,
    tokenHandle: number,
    permission: 'allowRead' | 'allowInsert' | 'allowUpdate' | 'allowDelete',
  ): Promise<PersonApiTokenItem> {
    const token = await this.em.findOne(
      PersonApiTokenItem,
      { handle: tokenHandle },
      { populate: ['person'] },
    );
    if (!token) {
      throw new NotFoundException('auth.apiTokenNotFound');
    }

    const ownerHandle = this.extractHandleValue(token.person);
    const currentHandle = currentUser.handle;
    if (ownerHandle !== currentHandle) {
      const entityPermission = this.currentService.getEntityPermissions(
        currentUser,
        'personApiToken',
      );
      const stageKey = `${permission}Stage`;

      if (
        !entityPermission[permission] ||
        entityPermission[stageKey] !== 'global'
      ) {
        throw new ForbiddenException('global.permissionDenied');
      }
    }

    return token;
  }

  private resolveManagedPersonHandle(
    currentUser: PersonItem,
    requestedPersonHandle: number | undefined,
    permission: 'allowRead' | 'allowInsert' | 'allowUpdate' | 'allowDelete',
  ): number {
    const currentHandle = currentUser.handle;
    const targetHandle = requestedPersonHandle ?? currentHandle;

    if (!targetHandle) {
      throw new ForbiddenException('global.permissionDenied');
    }

    if (targetHandle === currentHandle) {
      return targetHandle;
    }

    const entityPermission = this.currentService.getEntityPermissions(
      currentUser,
      'personApiToken',
    );
    const stageKey = `${permission}Stage`;

    if (
      !entityPermission[permission] ||
      entityPermission[stageKey] !== 'global'
    ) {
      throw new ForbiddenException('global.permissionDenied');
    }

    return targetHandle;
  }

  private toApiTokenResponse(token: PersonApiTokenItem): ApiTokenResponseDto {
    return {
      handle: token.handle ?? 0,
      description: token.description,
      tokenPrefix: token.tokenPrefix,
      isActive: token.isActive,
      expiresAt: token.expiresAt,
      lastUsedAt: token.lastUsedAt,
      allowedIps: token.allowedIps,
      personHandle: this.extractHandleValue(token.person) ?? 0,
      createdAt: token.createdAt ?? new Date(),
      updatedAt: token.updatedAt ?? new Date(),
    };
  }

  private normalizeAllowedIps(allowedIps?: string[]): string[] | undefined {
    const normalized = allowedIps
      ?.map((ip) => ip.trim())
      .filter((ip) => ip.length > 0);

    return normalized?.length ? normalized : undefined;
  }

  private generateApiTokenSecret(): string {
    return `sap_${crypto.randomBytes(32).toString('hex')}`;
  }

  private hashApiToken(rawToken: string): string {
    return `${PERSON_API_TOKEN_HASH_INDICATOR}${crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex')}`;
  }
  private extractHandleValue(
    value: number | PersonItem | null | undefined,
  ): number | undefined {
    if (typeof value === 'number') {
      return value;
    }

    return value?.handle;
  }
}
