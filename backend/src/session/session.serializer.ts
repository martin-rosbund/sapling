import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { AuthService } from '../auth/auth.service';
import type { PersonItem } from '../entity/PersonItem';

export interface SessionUserPayload {
  /** Real (logged-in) user handle. Never replaced while a session lives. */
  handle: number;
  /**
   * Optional impersonation target. When set and the real user is an active
   * administrator, the deserialized `req.user` is the target person and the
   * real user is exposed via `req.user._impersonator`.
   */
  impersonatedHandle?: number;
}

export interface ImpersonatorInfo {
  handle: number;
  firstName: string;
  lastName: string;
}

/**
 * @class SessionSerializer
 * @version         1.1
 * @author          Martin Rosbund
 * @summary         Handles how user data is stored in and retrieved from the
 *                  session. Supports administrator impersonation by allowing
 *                  the payload to carry an optional impersonation target.
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

      const realUser = await this.authService.getSecurityUserByHandle(
        payload.handle,
      );

      if (!realUser || realUser.isActive === false) {
        done(null, false);
        return;
      }

      const impersonatedHandle = payload.impersonatedHandle;
      if (
        typeof impersonatedHandle === 'number' &&
        impersonatedHandle !== realUser.handle
      ) {
        const realIsAdmin = ((): boolean => {
          for (const role of realUser.roles ?? []) {
            if (
              typeof role === 'object' &&
              role !== null &&
              (role as { isAdministrator?: boolean }).isAdministrator === true
            ) {
              return true;
            }
          }
          return false;
        })();

        if (realIsAdmin) {
          const target =
            await this.authService.getSecurityUserByHandle(impersonatedHandle);

          if (target && target.isActive !== false) {
            const impersonator: ImpersonatorInfo = {
              handle: realUser.handle as number,
              firstName: realUser.firstName,
              lastName: realUser.lastName,
            };
            (
              target as PersonItem & { _impersonator?: ImpersonatorInfo }
            )._impersonator = impersonator;
            done(null, target);
            return;
          }
        }
      }

      done(null, realUser);
    } catch (error) {
      done(error as Error, null);
    }
  }
  // #endregion
}
