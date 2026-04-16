import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Passport strategy for local username/password authentication.
 *
 * @property        authService          Service for validating user credentials
 * @method          constructor          Initializes the local strategy with custom fields
 * @method          validate             Validates the user using the AuthService
 */
// Passport strategy for local username/password authentication

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  /**
   * Initializes the local strategy with custom username and password fields.
   * @param authService Service for validating user credentials
   */
  constructor(private authService: AuthService) {
    super({
      usernameField: 'loginName',
      passwordField: 'loginPassword',
    });
  }

  /**
   * Validates the user using the AuthService.
   * @param loginName The user's login name
   * @param loginPassword The user's password
   * @returns The validated user object
   */
  async validate(loginName: string, loginPassword: string): Promise<any> {
    return await this.authService.validate(loginName, loginPassword);
  }
}
