import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { OIDCStrategy, IProfile } from 'passport-azure-ad';
import { EntityManager } from '@mikro-orm/core';
import { PersonItem } from 'src/entity/PersonItem';
import { PersonTypeItem } from 'src/entity/PersonTypeItem';
import {
  AZURE_AD_ALLOW_HTTP,
  AZURE_AD_CLIENT_ID,
  AZURE_AD_CLIENT_SECRET,
  AZURE_AD_IDENTITY_METADATA,
  AZURE_AD_REDIRECT_URL,
  AZURE_AD_RESPONSE_MODE,
  AZURE_AD_RESPONSE_TYPE,
  AZURE_AD_SCOPE,
} from 'src/constants/project.constants';

// Passport strategy for Azure Active Directory authentication (OIDC)

@Injectable()
export class AzureStrategy extends PassportStrategy(OIDCStrategy, 'azure-ad') {
  /**
   * Initializes the Azure AD strategy with configuration from environment variables.
   * @param em - MikroORM EntityManager for database access
   */
  constructor(private readonly em: EntityManager) {
    console.log('Initializing AzureStrategy with the following config:');
    console.log('Identity Metadata:', AZURE_AD_IDENTITY_METADATA);
    console.log('Client ID:', AZURE_AD_CLIENT_ID);
    console.log('Redirect URL:', AZURE_AD_REDIRECT_URL);
    console.log('Allow HTTP for Redirect URL:', AZURE_AD_ALLOW_HTTP);
    console.log('Scope:', AZURE_AD_SCOPE);
    super({
      identityMetadata: AZURE_AD_IDENTITY_METADATA,
      clientID: AZURE_AD_CLIENT_ID,
      responseType: AZURE_AD_RESPONSE_TYPE,
      responseMode: AZURE_AD_RESPONSE_MODE,
      redirectUrl: AZURE_AD_REDIRECT_URL,
      clientSecret: AZURE_AD_CLIENT_SECRET,
      allowHttpForRedirectUrl: AZURE_AD_ALLOW_HTTP,
      useCookieInsteadOfSession: false,
      passReqToCallback: true,
      scope: AZURE_AD_SCOPE,
    });
  }

  /**
   * Called after Azure AD has successfully authenticated the user.
   * Finds or creates a PersonItem in the database based on the Azure profile.
   * @param req - The request object
   * @param profile - The Azure AD user profile
   * @returns The PersonItem entity
   */
  async validate(req: any, profile: IProfile): Promise<PersonItem> {
    let person = await this.em.findOne(PersonItem, { loginName: profile.oid });
    const personType = await this.em.findOne(PersonTypeItem, {
      handle: 'azure',
    });

    console.log('Azure AD profile:', profile);
    if (!person) {
      person = this.em.create(PersonItem, {
        loginName: profile.oid || '',
        firstName: profile.name?.givenName || '',
        lastName: profile.name?.familyName || '',
        email: profile.upn,
        type: personType,
      });
      await this.em.persistAndFlush(person);
    }

    return person;
  }
}
