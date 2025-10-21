import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';

/**
 * SessionSerializer handles how user data is stored in and retrieved from the session.
 * Extends PassportSerializer to customize session serialization and deserialization logic.
 */
@Injectable()
export class SessionSerializer extends PassportSerializer {
  /**
   * Determines which user data is stored in the session.
   *
   * @param {Express.User} user - The user object to serialize.
   * @param {(err: Error, user: Express.User) => void} done - Callback to complete serialization.
   */
  serializeUser(
    user: Express.User,
    done: (err: Error, user: Express.User) => void,
  ): any {
    // Only the unique OID or minimal user info should be stored in the session.
    done(null as unknown as Error, user);
  }

  /**
   * Retrieves the full user data based on the information stored in the session.
   *
   * @param {Express.User} payload - The user data stored in the session.
   * @param {(err: Error, payload: Express.User) => void} done - Callback to complete deserialization.
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
}
