import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { OIDCStrategy, IProfile } from 'passport-azure-ad';
import { EntityManager } from '@mikro-orm/core';
import { PersonItem } from 'src/entity/PersonItem';

// Passport strategy for Azure Active Directory authentication (OIDC)

@Injectable()
export class AzureStrategy extends PassportStrategy(OIDCStrategy, 'azure-ad') {
  /**
   * Initializes the Azure AD strategy with configuration from environment variables.
   * @param em - MikroORM EntityManager for database access
   */
  constructor(private readonly em: EntityManager) {
    super({
      identityMetadata: process.env.AZURE_AD_IDENTITY_METADATA || '',
      clientID: process.env.AZURE_AD_CLIENT_ID || '',
      responseType: 'code',
      responseMode: 'form_post',
      redirectUrl: process.env.AZURE_AD_REDIRECT_URL || '',
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || '',
      allowHttpForRedirectUrl: process.env.AZURE_AD_ALLOW_HTTP === 'true',
      useCookieInsteadOfSession: false,
      passReqToCallback: true,
      scope: ['profile', 'openid', 'email', 'offline_access', 'User.Read'],
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
    console.log('Azure AD profile:', profile);
    if (!person) {
      person = this.em.create(PersonItem, {
        loginName: profile.oid || '',
        firstName: profile.name?.givenName || '',
        lastName: profile.name?.familyName || '',
        email: profile.upn,
      });
      await this.em.persistAndFlush(person);
    }

    return person;
  }
}
