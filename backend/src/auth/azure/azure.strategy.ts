import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import { EntityManager } from '@mikro-orm/core';
import { PersonItem } from '../../entity/PersonItem';
import { AuthService } from '../auth.service';
import {
  AZURE_AD_CLIENT_ID,
  AZURE_AD_CLIENT_SECRET,
  AZURE_AD_REDIRECT_URL,
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
    console.log('Client ID:', AZURE_AD_CLIENT_ID);
    console.log('Client Secret:', AZURE_AD_CLIENT_SECRET);
    console.log('Redirect URL:', AZURE_AD_REDIRECT_URL);
    console.log('Scope:', AZURE_AD_SCOPE);
    console.log('Tenant ID:', AZURE_AD_TENNANT_ID);

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
    accessToken: string,
    refreshToken: string,
    profile: MicrosoftProfile,
  ): Promise<PersonItem> {
    console.log('AzureStrategy validate called with profile:', profile);
    console.log('accessToken', accessToken);
    console.log('refreshToken', refreshToken);
    console.log('req', req.sessionID);

    return this.authService.saveNewLogin(
      'azure',
      req.sessionID ?? '',
      profile.id,
      accessToken,
      refreshToken,
      profile.name?.givenName ?? '',
      profile.name?.familyName ?? '',
      profile.emails?.[0]?.value ?? '',
    );
  }
}
