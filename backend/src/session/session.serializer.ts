import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';

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
  // #region Methods: Session Serialization
  /**
   * Determines which user data is stored in the session.
   * Customizes the serialization logic for Passport.js sessions.
   *
   * @param {Express.User} user - The user object to serialize.
   * @param {(err: Error, user: Express.User) => void} done - Callback to complete serialization.
   * @returns {any} Serialized user data for session storage.
   */
  serializeUser(
    user: Express.User,
    done: (err: Error, user: Express.User) => void,
  ): any {
    done(null as unknown as Error, user);
  }
  // #endregion

  // #region Methods: Session Deserialization
  /**
   * Retrieves the full user data based on the information stored in the session.
   * Customizes the deserialization logic for Passport.js sessions.
   *
   * @param {Express.User} payload - The user data stored in the session.
   * @param {(err: Error, payload: Express.User) => void} done - Callback to complete deserialization.
   * @returns {any} Deserialized user data for application use.
   */
  deserializeUser(
    payload: Express.User,
    done: (err: Error, payload: Express.User) => void,
  ): any {
    // In a real application, you would fetch the user from the database here:
    // const user = await this.userService.findById(payload.oid);
    // For now, simply return the stored payload object.
    done(null as unknown as Error, payload);
  }
  // #endregion
}
