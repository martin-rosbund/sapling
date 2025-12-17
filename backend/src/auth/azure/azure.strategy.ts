import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import { EntityManager } from '@mikro-orm/core';
import { PersonItem } from '../../entity/PersonItem';
import { PersonTypeItem } from '../../entity/PersonTypeItem';
import { AuthService } from '../auth.service';
import {
  AZURE_AD_ALLOW_HTTP,
  AZURE_AD_CLIENT_ID,
  AZURE_AD_CLIENT_SECRET,
  AZURE_AD_REDIRECT_URL,
  AZURE_AD_RESPONSE_MODE,
  AZURE_AD_RESPONSE_TYPE,
  AZURE_AD_SCOPE,
  AZURE_AD_TENNANT_ID,
} from '../../constants/project.constants';

// Passport strategy for Azure Active Directory authentication (OIDC)

interface MicrosoftProfile {
  id: string;
  displayName: string;
  name: MicrosoftProfileName;
  emails: MicrosoftProfileMail[];
}

interface MicrosoftProfileMail {
  type: 'work' | 'home' | 'other';
  value: string;
}

interface MicrosoftProfileName {
  familyName: string;
  givenName: string;
}

@Injectable()
export class AzureStrategy extends PassportStrategy(
  MicrosoftStrategy,
  'azure-ad',
) {
  /**
   * Initializes the Azure AD strategy with configuration from environment variables.
   * @param em - MikroORM EntityManager for database access
   */
  constructor(
    private readonly em: EntityManager,
    private readonly authService: AuthService,
  ) {
    console.log('Initializing AzureStrategy with the following config:');
    console.log('Tennant ID:', AZURE_AD_TENNANT_ID);
    console.log('Client ID:', AZURE_AD_CLIENT_ID);
    console.log('Response Type:', AZURE_AD_RESPONSE_TYPE);
    console.log('Response Mode:', AZURE_AD_RESPONSE_MODE);
    console.log('Redirect URL:', AZURE_AD_REDIRECT_URL);
    console.log('Allow HTTP for Redirect URL:', AZURE_AD_ALLOW_HTTP);
    console.log('Scope:', AZURE_AD_SCOPE);
    super({
      clientID: AZURE_AD_CLIENT_ID,
      clientSecret: AZURE_AD_CLIENT_SECRET,
      callbackURL: AZURE_AD_REDIRECT_URL,
      scope: AZURE_AD_SCOPE,
      tenant: AZURE_AD_TENNANT_ID,
      passReqToCallback: true,
    });
  }

  /**
   * Called after Azure AD has successfully authenticated the user.
   * Finds or creates a PersonItem in the database based on the Azure profile.
   * @param req - The request object
   * @param profile - The Azure AD user profile
   * @returns The PersonItem entity
   */
  async validate(
    req: { sessionID?: string },
    access_token: any,
    refresh_token: any,
    profile: MicrosoftProfile,
  ): Promise<PersonItem> {
    let person = await this.authService.getSecurityUser(profile.id);
    console.log('AzureStrategy validate called with profile:', profile);
    console.log('access_token', access_token);
    console.log('refresh_token', refresh_token);
    console.log('req', req.sessionID);

    if (!person) {
      const personType = await this.em.findOne(PersonTypeItem, {
        handle: 'azure',
      });

      const firstName = profile.name?.givenName ?? profile.displayName ?? '';
      const lastName = profile.name?.familyName ?? '';

      person = this.em.create(PersonItem, {
        loginName: profile.id || '',
        firstName: firstName,
        lastName: lastName,
        email:
          profile.emails && profile.emails.length > 0
            ? profile.emails[0].value
            : '',
        type: personType,
      });

      await this.em.persist(person).flush();
    }

    return person;
  }
}
