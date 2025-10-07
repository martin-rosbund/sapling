import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { OIDCStrategy, IProfile } from 'passport-azure-ad';
import { EntityManager } from '@mikro-orm/core';
import { PersonItem } from 'src/entity/PersonItem';

@Injectable()
export class AzureStrategy extends PassportStrategy(OIDCStrategy, 'azure-ad') {
  constructor(private readonly em: EntityManager) {
    console.log('AzureStrategy initialized');
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

  // Diese Methode wird aufgerufen, nachdem Azure den Benutzer erfolgreich authentifiziert hat.
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
