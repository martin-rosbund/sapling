import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { EntityManager } from '@mikro-orm/core';
import { PersonItem } from 'src/entity/PersonItem';
import { PersonTypeItem } from 'src/entity/PersonTypeItem';
import { AuthService } from '../auth.service';
import {
  GOOGLE_CALLBACK_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_SCOPE,
} from 'src/constants/project.constants';

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
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<PersonItem> {
    let person = await this.authService.getSecurityUser(profile.id);
    const personType = await this.em.findOne(PersonTypeItem, {
      handle: 'google',
    });
    if (!person) {
      person = this.em.create(PersonItem, {
        loginName: profile.id,
        firstName: profile.name?.givenName || '',
        lastName: profile.name?.familyName || '',
        email: profile.emails?.[0]?.value || '',
        type: personType,
      });
      await this.em.persistAndFlush(person);
    }
    return person;
  }
}
