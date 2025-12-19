import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { EntityManager } from '@mikro-orm/core';
import { PersonItem } from '../../entity/PersonItem';
import { AuthService } from '../auth.service';
import {
  GOOGLE_CALLBACK_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_SCOPE,
} from '../../constants/project.constants';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly em: EntityManager,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
      scope: GOOGLE_SCOPE,
      passReqToCallback: true,
    });
  }

  async validate(
    req: { sessionId?: string },
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<PersonItem> {
    return this.authService.saveNewLogin(
      'google',
      req.sessionId ?? '',
      profile.id,
      accessToken,
      refreshToken,
      profile.name?.givenName ?? '',
      profile.name?.familyName ?? '',
      profile.emails?.[0]?.value ?? '',
    );
  }
}
