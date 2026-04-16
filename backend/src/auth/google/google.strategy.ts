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

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Passport strategy for Google OAuth authentication.
 *
 * @property        em                   MikroORM EntityManager for database access
 * @property        authService          Service for authentication logic
 * @method          constructor          Initializes the Google strategy with configuration
 * @method          validate             Called after Google has successfully authenticated the user
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  /**
   * Initializes the Google strategy with configuration from environment variables.
   * @param em MikroORM EntityManager for database access
   * @param authService Service for authentication logic
   */
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

  /**
   * Called after Google has successfully authenticated the user.
   * Finds or creates a PersonItem in the database based on the Google profile.
   * @param req The request object
   * @param accessToken Google access token
   * @param refreshToken Google refresh token
   * @param profile The Google user profile
   * @returns The PersonItem entity or null
   */
  async validate(
    req: { sessionId?: string },
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<PersonItem | null> {
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
