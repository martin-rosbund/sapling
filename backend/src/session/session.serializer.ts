import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { AuthService } from '../auth/auth.service';

interface SessionUserPayload {
  handle: number;
}

/**
 * @class SessionSerializer
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Handles how user data is stored in and retrieved from the session. Extends PassportSerializer to customize session serialization and deserialization logic.
 *
 * @method          serializeUser(user: Express.User, done: Function): any      Determines which user data is stored in the session
 * @method          deserializeUser(payload: Express.User, done: Function): any  Retrieves the full user data based on session information
 */
@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private readonly authService: AuthService) {
    super();
  }

  // #region Methods: Session Serialization
  /**
   * Determines which user data is stored in the session.
   * Customizes the serialization logic for Passport.js sessions.
   *
   * @param {Express.User} user - The user object to serialize.
   * @param {(err: Error | null, user: SessionUserPayload) => void} done - Callback to complete serialization.
   * @returns {any} Serialized user data for session storage.
   */
  serializeUser(
    user: Express.User,
    done: (err: Error | null, user: SessionUserPayload) => void,
  ): any {
    const handle =
      typeof user === 'object' && user && 'handle' in user
        ? user.handle
        : undefined;

    if (typeof handle !== 'number') {
      done(
        new Error('Cannot serialize a session without a numeric user handle'),
        {
          handle: 0,
        },
      );
      return;
    }

    done(null, { handle });
  }
  // #endregion

  // #region Methods: Session Deserialization
  /**
   * Retrieves the full user data based on the information stored in the session.
   * Customizes the deserialization logic for Passport.js sessions.
   *
   * @param {SessionUserPayload} payload - The user data stored in the session.
   * @param {(err: Error | null, payload: Express.User | false | null) => void} done - Callback to complete deserialization.
   * @returns {any} Deserialized user data for application use.
   */
  async deserializeUser(
    payload: SessionUserPayload,
    done: (err: Error | null, payload: Express.User | false | null) => void,
  ): Promise<void> {
    try {
      if (typeof payload?.handle !== 'number') {
        done(null, false);
        return;
      }

      const user = await this.authService.getSecurityUserByHandle(
        payload.handle,
      );

      if (!user || user.isActive === false) {
        done(null, false);
        return;
      }

      done(null, user);
    } catch (error) {
      done(error as Error, null);
    }
  }
  // #endregion
}
