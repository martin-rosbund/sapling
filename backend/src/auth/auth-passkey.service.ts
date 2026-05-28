import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import type { Request } from 'express';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
  type WebAuthnCredential,
} from '@simplewebauthn/server';
import { PersonItem } from '../entity/PersonItem';
import { PersonPasskeyItem } from '../entity/PersonPasskeyItem';
import { SAPLING_FRONTEND_URL } from '../constants/project.constants';
import { AuthService } from './auth.service';
import { PasskeyResponseDto } from './dto/passkey.dto';

export interface PasskeyRequestContext {
  origin: string;
  rpID: string;
  rpName: string;
}

@Injectable()
export class AuthPasskeyService {
  private readonly rpName = 'Sapling';

  constructor(
    private readonly em: EntityManager,
    private readonly authService: AuthService,
  ) {}

  resolveRequestContext(req: Request): PasskeyRequestContext {
    const origin =
      this.normalizeOrigin(SAPLING_FRONTEND_URL) ??
      this.normalizeOrigin(this.getHeaderValue(req.headers.origin)) ??
      this.normalizeOrigin(this.getHeaderValue(req.headers.referer)) ??
      this.normalizeRequestOrigin(req) ??
      'http://localhost';

    return {
      origin,
      rpID: new URL(origin).hostname,
      rpName: this.rpName,
    };
  }

  async hasPasskeysForPerson(personHandle?: number): Promise<boolean> {
    if (!personHandle) {
      return false;
    }

    const count = await this.em.count(PersonPasskeyItem, {
      person: { handle: personHandle },
    });
    return count > 0;
  }

  async listPasskeys(currentUser: PersonItem): Promise<PasskeyResponseDto[]> {
    const personHandle = this.requireUserHandle(currentUser);
    const passkeys = await this.em.find(
      PersonPasskeyItem,
      { person: { handle: personHandle } },
      { orderBy: { createdAt: 'desc' } },
    );

    return passkeys.map((passkey) => this.toResponse(passkey));
  }

  async createRegistrationOptions(
    currentUser: PersonItem,
    context: PasskeyRequestContext,
  ): Promise<PublicKeyCredentialCreationOptionsJSON> {
    const personHandle = this.requireUserHandle(currentUser);
    const passkeys = await this.em.find(PersonPasskeyItem, {
      person: { handle: personHandle },
    });

    return generateRegistrationOptions({
      rpName: context.rpName,
      rpID: context.rpID,
      userName:
        currentUser.loginName ??
        currentUser.email ??
        `person-${String(personHandle)}`,
      userID: Buffer.from(`sapling-person-${personHandle}`, 'utf8'),
      userDisplayName: `${currentUser.firstName ?? ''} ${
        currentUser.lastName ?? ''
      }`.trim(),
      attestationType: 'none',
      excludeCredentials: passkeys.map((passkey) => ({
        id: passkey.credentialId,
        transports: this.normalizeTransports(passkey.transports),
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });
  }

  async verifyRegistration(
    currentUser: PersonItem,
    response: RegistrationResponseJSON,
    expectedChallenge: string,
    context: PasskeyRequestContext,
    label?: string,
  ): Promise<PasskeyResponseDto> {
    const personHandle = this.requireUserHandle(currentUser);
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: context.origin,
      expectedRPID: context.rpID,
      requireUserVerification: false,
    });

    if (!verification.verified) {
      throw new ForbiddenException('login.passkeyVerificationFailed');
    }

    const credential = verification.registrationInfo.credential;
    const existing = await this.em.findOne(PersonPasskeyItem, {
      credentialId: credential.id,
    });
    if (existing) {
      throw new BadRequestException('login.passkeyAlreadyRegistered');
    }

    const person = await this.em.findOne(PersonItem, { handle: personHandle });
    if (!person) {
      throw new NotFoundException('auth.personNotFound');
    }

    const passkey = this.em.create(PersonPasskeyItem, {
      label: this.normalizeLabel(label),
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter,
      transports: this.normalizeTransports(response.response.transports),
      credentialDeviceType: verification.registrationInfo.credentialDeviceType,
      credentialBackedUp: verification.registrationInfo.credentialBackedUp,
      person,
    });

    await this.em.persist(passkey).flush();
    return this.toResponse(passkey);
  }

  async createAuthenticationOptions(
    personHandle: number,
    context: PasskeyRequestContext,
  ): Promise<PublicKeyCredentialRequestOptionsJSON> {
    const passkeys = await this.em.find(PersonPasskeyItem, {
      person: { handle: personHandle },
    });

    if (passkeys.length === 0) {
      throw new ForbiddenException('login.passkeyMissing');
    }

    return generateAuthenticationOptions({
      rpID: context.rpID,
      allowCredentials: passkeys.map((passkey) => ({
        id: passkey.credentialId,
        transports: this.normalizeTransports(passkey.transports),
      })),
      userVerification: 'preferred',
    });
  }

  async verifyAuthentication(
    personHandle: number,
    response: AuthenticationResponseJSON,
    expectedChallenge: string,
    context: PasskeyRequestContext,
  ): Promise<PersonItem> {
    const passkey = await this.em.findOne(
      PersonPasskeyItem,
      {
        credentialId: response.id,
        person: { handle: personHandle },
      },
      { populate: ['person'] },
    );

    if (!passkey) {
      throw new ForbiddenException('login.passkeyVerificationFailed');
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: context.origin,
      expectedRPID: context.rpID,
      credential: this.toWebAuthnCredential(passkey),
      requireUserVerification: false,
    });

    if (!verification.verified) {
      throw new ForbiddenException('login.passkeyVerificationFailed');
    }

    passkey.counter = verification.authenticationInfo.newCounter;
    passkey.lastUsedAt = new Date();
    passkey.credentialDeviceType =
      verification.authenticationInfo.credentialDeviceType;
    passkey.credentialBackedUp =
      verification.authenticationInfo.credentialBackedUp;
    await this.em.flush();

    const user = await this.authService.getSecurityUserByHandle(personHandle);
    if (!user || user.isActive === false) {
      throw new ForbiddenException('global.permissionDenied');
    }

    return user;
  }

  async deletePasskey(
    currentUser: PersonItem,
    passkeyHandle: number,
  ): Promise<{ deleted: boolean }> {
    const personHandle = this.requireUserHandle(currentUser);
    const passkey = await this.em.findOne(PersonPasskeyItem, {
      handle: passkeyHandle,
      person: { handle: personHandle },
    });

    if (!passkey) {
      throw new NotFoundException('global.notFound');
    }

    await this.em.remove(passkey).flush();
    return { deleted: true };
  }

  private requireUserHandle(user: PersonItem): number {
    if (typeof user.handle !== 'number') {
      throw new ForbiddenException('global.permissionDenied');
    }

    return user.handle;
  }

  private toResponse(passkey: PersonPasskeyItem): PasskeyResponseDto {
    return {
      handle: passkey.handle ?? 0,
      label: passkey.label,
      transports: passkey.transports,
      credentialDeviceType: passkey.credentialDeviceType,
      credentialBackedUp: passkey.credentialBackedUp,
      lastUsedAt: passkey.lastUsedAt,
      createdAt: passkey.createdAt ?? new Date(),
    };
  }

  private toWebAuthnCredential(passkey: PersonPasskeyItem): WebAuthnCredential {
    return {
      id: passkey.credentialId,
      publicKey: Buffer.from(passkey.publicKey, 'base64url'),
      counter: passkey.counter,
      transports: this.normalizeTransports(passkey.transports),
    };
  }

  private normalizeLabel(label?: string): string {
    const normalized = label?.trim();
    return normalized?.length ? normalized.slice(0, 128) : 'Passkey';
  }

  private normalizeTransports(
    transports?: string[],
  ): AuthenticatorTransportFuture[] | undefined {
    const normalized = transports
      ?.map((transport) => transport.trim())
      .filter((transport) => transport.length > 0);

    return normalized?.length
      ? (normalized as AuthenticatorTransportFuture[])
      : undefined;
  }

  private getHeaderValue(
    value: string | string[] | undefined,
  ): string | undefined {
    return Array.isArray(value) ? value[0] : value;
  }

  private normalizeOrigin(value: string | undefined): string | null {
    if (!value) {
      return null;
    }

    try {
      return new URL(value).origin;
    } catch {
      return null;
    }
  }

  private normalizeRequestOrigin(req: Request): string | null {
    const host = req.get('host') || this.getHeaderValue(req.headers.host);
    if (!host) {
      return null;
    }

    return this.normalizeOrigin(`${req.protocol || 'http'}://${host}`);
  }
}
